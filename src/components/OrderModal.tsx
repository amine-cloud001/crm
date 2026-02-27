"use client";

import { useState, useEffect, useCallback } from "react";

interface Order {
  id: number;
  shopifyOrderId: string;
  shopifyOrderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  products: string;
  totalPrice: number;
  currency: string;
  senditCode: string | null;
  senditStatus: string | null;
  senditFee: number | null;
  senditLabelUrl: string | null;
  status: string;
  districtId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface District {
  id: number;
  ville: string;
  name: string;
  price: string;
  delais: string;
}

interface OrderModalProps {
  orderId: number | null;
  onClose: () => void;
  onOrderUpdated: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  TO_PREPARE: "A preparer",
  NEW_DESTINATION: "A changer",
  TO_PICKUP: "Ramassage en cours",
  PICKEDUP: "Ramasse",
  WAREHOUSE: "Entrepot",
  TRANSIT: "En transit",
  DISTRIBUTED: "Distribue",
  UNREACHABLE: "Injoignable",
  POSTPONED: "Reporte",
  DELIVERING: "En cours de livraison",
  DELIVERED: "Livre",
  CANCELED: "Annule",
  REJECTED: "Refuse",
};

export default function OrderModal({ orderId, onClose, onOrderUpdated }: OrderModalProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<number | null>(null);
  const [districtSearch, setDistrictSearch] = useState("");
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        setSelectedDistrict(data.data.districtId);
      }
    } catch {
      setError("Failed to load order");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const searchDistricts = async (query: string) => {
    setDistrictSearch(query);
    if (query.length < 2) {
      setDistricts([]);
      return;
    }
    try {
      const res = await fetch(`/api/districts?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setDistricts(data.data);
        setShowDistrictDropdown(true);
      }
    } catch {
      // ignore
    }
  };

  const handleConfirm = async () => {
    if (!order) return;

    if (!selectedDistrict) {
      setError("Please select a delivery city/district first");
      return;
    }

    setConfirming(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ district_id: selectedDistrict }),
      });

      const data = await res.json();

      if (data.success) {
        setOrder(data.data);
        onOrderUpdated();
      } else {
        setError(data.error || "Failed to confirm order");
      }
    } catch {
      setError("Failed to confirm order");
    }

    setConfirming(false);
  };

  if (!orderId) return null;

  const products = order ? JSON.parse(order.products) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {order ? `Order ${order.shopifyOrderNumber}` : "Loading..."}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading order details...</div>
        ) : !order ? (
          <div className="p-12 text-center text-red-500">Order not found</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="App Status" value={order.status} />
              {order.senditStatus && (
                <StatusBadge
                  label="Sendit"
                  value={STATUS_LABELS[order.senditStatus] || order.senditStatus}
                  senditStatus={order.senditStatus}
                />
              )}
              {order.senditCode && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full font-mono">
                  {order.senditCode}
                </span>
              )}
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Customer</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2 font-medium">{order.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <span className="ml-2 font-medium">{order.customerPhone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Address:</span>
                  <span className="ml-2 font-medium">{order.customerAddress}</span>
                </div>
                <div>
                  <span className="text-gray-500">City:</span>
                  <span className="ml-2 font-medium">{order.customerCity}</span>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider mb-3">Products</h3>
              <div className="space-y-2">
                {products.map((p: { title: string; quantity: number; price: string; sku: string; variant: string }, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm bg-white rounded-lg p-3">
                    <div>
                      <span className="font-medium">{p.title}</span>
                      {p.variant && <span className="text-gray-500 ml-2">({p.variant})</span>}
                      {p.sku && <span className="text-gray-400 ml-2 font-mono text-xs">{p.sku}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">x{p.quantity}</span>
                      <span className="ml-3 font-medium">{p.price} {order.currency}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between font-bold">
                <span>Total</span>
                <span>{order.totalPrice} {order.currency}</span>
              </div>
            </div>

            {/* Sendit Fee */}
            {order.senditFee !== null && (
              <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-orange-700 font-medium">Delivery Fee (Sendit)</span>
                <span className="font-bold text-orange-800">{order.senditFee} MAD</span>
              </div>
            )}

            {/* Label URL */}
            {order.senditLabelUrl && (
              <a
                href={order.senditLabelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl p-3 font-medium transition-colors"
              >
                Print Label
              </a>
            )}

            {/* District Selection (for new orders) */}
            {!order.senditCode && (
              <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-yellow-800 text-sm uppercase tracking-wider">
                  Select Delivery City (Required)
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={districtSearch}
                    onChange={(e) => searchDistricts(e.target.value)}
                    onFocus={() => districts.length > 0 && setShowDistrictDropdown(true)}
                    placeholder="Search city... (e.g. Casablanca)"
                    className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900"
                  />
                  {showDistrictDropdown && districts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {districts.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setSelectedDistrict(d.id);
                            setDistrictSearch(`${d.ville} - ${d.name}`);
                            setShowDistrictDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm border-b border-gray-50 last:border-0 ${
                            selectedDistrict === d.id ? "bg-yellow-100 font-medium" : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900">{d.ville}</span>
                          <span className="text-gray-500"> - {d.name}</span>
                          <span className="text-gray-400 ml-2">({d.price} MAD, {d.delais})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedDistrict && (
                  <p className="text-sm text-yellow-700">
                    Selected district ID: {selectedDistrict}
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-700 rounded-xl p-4 text-sm">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!order.senditCode && order.status === "new" && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming || !selectedDistrict}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {confirming ? "Creating parcel..." : "Confirm & Send to Sendit"}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, value, senditStatus }: { label: string; value: string; senditStatus?: string }) {
  const colorMap: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    confirmed: "bg-yellow-100 text-yellow-800",
    shipped: "bg-purple-100 text-purple-800",
    delivering: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    canceled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
    issue: "bg-orange-100 text-orange-800",
    returned: "bg-gray-100 text-gray-800",
  };

  const senditColorMap: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-800",
    TO_PREPARE: "bg-yellow-100 text-yellow-800",
    TO_PICKUP: "bg-blue-100 text-blue-800",
    PICKEDUP: "bg-blue-200 text-blue-900",
    WAREHOUSE: "bg-purple-100 text-purple-800",
    TRANSIT: "bg-indigo-100 text-indigo-800",
    DISTRIBUTED: "bg-violet-100 text-violet-800",
    DELIVERING: "bg-cyan-100 text-cyan-800",
    DELIVERED: "bg-green-100 text-green-800",
    CANCELED: "bg-red-100 text-red-800",
    REJECTED: "bg-red-200 text-red-900",
    UNREACHABLE: "bg-orange-100 text-orange-800",
    POSTPONED: "bg-amber-100 text-amber-800",
    NEW_DESTINATION: "bg-pink-100 text-pink-800",
  };

  const colors = senditStatus
    ? senditColorMap[senditStatus] || "bg-gray-100 text-gray-800"
    : colorMap[value] || "bg-gray-100 text-gray-800";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors}`}>
      {label}: {value}
    </span>
  );
}
