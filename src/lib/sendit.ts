import { prisma } from "./prisma";

const SENDIT_BASE_URL = "https://app.sendit.ma/api/v1";

async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value || null;
}

async function getToken(): Promise<string> {
  // First try cached token
  const cached = await getSetting("sendit_token");
  if (cached) return cached;

  // Login to get new token
  const email = await getSetting("sendit_email");
  const password = await getSetting("sendit_password");

  if (!email || !password) {
    throw new Error("Sendit credentials not configured. Go to Settings to add them.");
  }

  const res = await fetch(`${SENDIT_BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Sendit login failed: ${res.status}`);
  }

  const data = await res.json();
  const token = data.data?.token;

  if (!token) {
    throw new Error("No token received from Sendit");
  }

  // Cache token
  await prisma.setting.upsert({
    where: { key: "sendit_token" },
    update: { value: token },
    create: { key: "sendit_token", value: token },
  });

  return token;
}

async function senditFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();

  const res = await fetch(`${SENDIT_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // If unauthorized, clear token and retry once
  if (res.status === 401 || res.status === 403) {
    await prisma.setting.deleteMany({ where: { key: "sendit_token" } });
    const newToken = await getToken();
    return fetch(`${SENDIT_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...options.headers,
      },
    });
  }

  return res;
}

export interface SenditParcelInput {
  district_id: number;
  name: string;
  phone: string;
  address: string;
  amount: number;
  reference: string;
  comment?: string;
  products?: string;
  allow_open?: number;
  allow_try?: number;
  products_from_stock?: number;
  packaging_id?: number;
  option_exchange?: number;
  pickup_district_id?: string;
  delivery_exchange_id?: string;
}

export interface SenditDelivery {
  code: string;
  status: string;
  fee: number;
  name: string;
  phone: string;
  address?: string;
  amount: number;
  comment: string;
  reference: string;
  products: Array<{
    reference: string;
    code: string;
    name: string;
    quantity: number;
  }>;
  district: {
    id: number;
    ville: string;
    name: string;
    price: number;
    delais: string;
  };
  last_action_at: string;
  status_return: string;
  labelUrl?: string;
}

export interface SenditDistrict {
  id: number;
  ville: string;
  name: string;
  arabic_name: string;
  price: string;
  delais: string;
  pickup_district: number;
}

// Create a new parcel in Sendit
export async function createParcel(input: SenditParcelInput): Promise<SenditDelivery> {
  const res = await senditFetch("/deliveries", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to create parcel in Sendit");
  }

  return data.data;
}

// Get parcel details by code
export async function getParcelDetails(code: string): Promise<SenditDelivery> {
  const res = await senditFetch(`/deliveries/${code}`);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to get parcel details");
  }

  return data.data;
}

// List all parcels
export async function listParcels(page = 1, search?: string): Promise<{
  data: SenditDelivery[];
  total: number;
  current_page: number;
  last_page: number;
}> {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("querystring", search);

  const res = await senditFetch(`/deliveries?${params}`);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to list parcels");
  }

  return data;
}

// Get all delivery statuses
export async function getAllStatuses(): Promise<Record<string, string>> {
  const res = await senditFetch("/all-status-deliveries");
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to get statuses");
  }

  return data.data;
}

// List districts (cities)
export async function listDistricts(page = 1, search?: string): Promise<{
  data: SenditDistrict[];
  total: number;
  current_page: number;
  last_page: number;
}> {
  const params = new URLSearchParams({ page: String(page) });
  if (search) params.set("querystring", search);

  const res = await senditFetch(`/districts?${params}`);
  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to list districts");
  }

  return data;
}

// Get all districts (paginate through all pages)
export async function getAllDistricts(): Promise<SenditDistrict[]> {
  const allDistricts: SenditDistrict[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const result = await listDistricts(page);
    allDistricts.push(...result.data);
    lastPage = result.last_page;
    page++;
  } while (page <= lastPage);

  return allDistricts;
}

// Get label URL for printing
export async function getLabels(codes: string[], printFormat = 1): Promise<string> {
  const res = await senditFetch("/deliveries/getlabels", {
    method: "POST",
    body: JSON.stringify({
      codesToPrint: codes.join(","),
      printFormat,
    }),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(data.message || "Failed to get labels");
  }

  return data.data.fileUrl;
}

// Map Sendit status to our app status
export function mapSenditStatusToAppStatus(senditStatus: string): string {
  switch (senditStatus) {
    case "PENDING":
    case "TO_PREPARE":
      return "confirmed";
    case "TO_PICKUP":
    case "PICKEDUP":
    case "WAREHOUSE":
    case "TRANSIT":
      return "shipped";
    case "DISTRIBUTED":
    case "DELIVERING":
      return "delivering";
    case "DELIVERED":
      return "delivered";
    case "CANCELED":
      return "canceled";
    case "REJECTED":
      return "rejected";
    case "UNREACHABLE":
    case "POSTPONED":
    case "NEW_DESTINATION":
      return "issue";
    default:
      return "confirmed";
  }
}
