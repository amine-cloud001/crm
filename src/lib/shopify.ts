import { prisma } from "./prisma";

async function getSetting(key: string): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value || null;
}

async function getShopifyConfig() {
  const storeUrl = await getSetting("shopify_store_url");
  const accessToken = await getSetting("shopify_access_token");

  if (!storeUrl || !accessToken) {
    throw new Error("Shopify credentials not configured. Go to Settings to add them.");
  }

  return { storeUrl, accessToken };
}

async function shopifyFetch(path: string, options: RequestInit = {}) {
  const { storeUrl, accessToken } = await getShopifyConfig();
  const baseUrl = storeUrl.replace(/\/$/, "");

  const res = await fetch(`${baseUrl}/admin/api/2024-01${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface ShopifyOrder {
  id: number;
  name: string; // e.g. "#1001"
  order_number: number;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
    phone: string | null;
    default_address?: {
      address1: string;
      address2: string;
      city: string;
      province: string;
      country: string;
      phone: string;
    };
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    country: string;
    phone: string;
    name: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
    sku: string;
    variant_title: string;
    product_id: number;
  }>;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  variants: Array<{
    id: number;
    title: string;
    sku: string;
    price: string;
    inventory_quantity: number;
    inventory_item_id: number;
  }>;
}

// Fetch orders from Shopify
export async function fetchOrders(params?: {
  status?: string;
  since_id?: string;
  created_at_min?: string;
  limit?: number;
}): Promise<ShopifyOrder[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("status", params?.status || "any");
  searchParams.set("limit", String(params?.limit || 50));
  if (params?.since_id) searchParams.set("since_id", params.since_id);
  if (params?.created_at_min) searchParams.set("created_at_min", params.created_at_min);

  const data = await shopifyFetch(`/orders.json?${searchParams}`);
  return data.orders;
}

// Fetch a single order
export async function fetchOrder(orderId: string): Promise<ShopifyOrder> {
  const data = await shopifyFetch(`/orders/${orderId}.json`);
  return data.order;
}

// Fetch products with inventory
export async function fetchProducts(limit = 50): Promise<ShopifyProduct[]> {
  const data = await shopifyFetch(`/products.json?limit=${limit}`);
  return data.products;
}

// Fetch product count
export async function fetchProductCount(): Promise<number> {
  const data = await shopifyFetch("/products/count.json");
  return data.count;
}

// Extract order data for our database
export function extractOrderData(order: ShopifyOrder) {
  const shippingAddr = order.shipping_address;
  const customer = order.customer;

  const customerName = shippingAddr
    ? `${shippingAddr.first_name} ${shippingAddr.last_name}`.trim()
    : customer
      ? `${customer.first_name} ${customer.last_name}`.trim()
      : "Unknown";

  const customerPhone =
    shippingAddr?.phone || customer?.phone || customer?.default_address?.phone || "";

  const customerAddress = shippingAddr
    ? [shippingAddr.address1, shippingAddr.address2].filter(Boolean).join(", ")
    : customer?.default_address
      ? [customer.default_address.address1, customer.default_address.address2]
          .filter(Boolean)
          .join(", ")
      : "";

  const customerCity = shippingAddr?.city || customer?.default_address?.city || "";

  const products = order.line_items.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    price: item.price,
    sku: item.sku,
    variant: item.variant_title,
  }));

  return {
    shopifyOrderId: String(order.id),
    shopifyOrderNumber: order.name,
    customerName,
    customerPhone,
    customerAddress,
    customerCity,
    products: JSON.stringify(products),
    totalPrice: parseFloat(order.total_price),
    currency: order.currency,
  };
}
