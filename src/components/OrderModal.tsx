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

interface Product {
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variant: string;
  image?: string | null;
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

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProducts, setEditProducts] = useState<Product[]>([]);
  const [editTotalPrice, setEditTotalPrice] = useState("");

  const isConfirmed = order?.senditCode != null;

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      const data = await res.json();
      if (data.success) {
        const o = data.data as Order;
        setOrder(o);
        setSelectedDistrict(o.districtId);
        // Initialize editable fields
        setEditName(o.customerName);
        setEditPhone(o.customerPhone);
        setEditAddress(o.customerAddress);
        const prods: Product[] = JSON.parse(o.products);
        setEditProducts(prods);
        setEditTotalPrice(String(o.totalPrice));
      }
    } catch {
      setError("Failed to load order");
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Recalculate total when product prices change
  const recalcTotal = (prods: Product[]) => {
    const total = prods.reduce((sum, p) => sum + parseFloat(p.price || "0") * p.quantity, 0);
    setEditTotalPrice(total.toFixed(2));
  };

  const updateProductPrice = (index: number, newPrice: string) => {
    const updated = [...editProducts];
    updated[index] = { ...updated[index], price: newPrice };
    setEditProducts(updated);
    recalcTotal(updated);
  };

  const searchDistricts = async (query: string) => {
    setDistrictSearch(query);
    if (query.length < 2) {
      setDistricts([]);
      setShowDistrictDropdown(false);
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
      setError("Veuillez selectionner une ville de livraison");
      return;
    }

    setConfirming(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          district_id: selectedDistrict,
          customerName: editName,
          customerPhone: editPhone,
          customerAddress: editAddress,
          totalPrice: parseFloat(editTotalPrice),
          products: JSON.stringify(editProducts),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOrder(data.data);
        onOrderUpdated();
      } else {
        setError(data.error || "Echec de la confirmation");
      }
    } catch {
      setError("Echec de la confirmation");
    }

    setConfirming(false);
  };

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {order ? `Commande ${order.shopifyOrderNumber}` : "Chargement..."}
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
          <div className="p-12 text-center text-gray-500">Chargement...</div>
        ) : !order ? (
          <div className="p-12 text-center text-red-500">Commande introuvable</div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="Statut" value={order.status} />
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

            {/* Customer Info - Editable */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider">Client</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nom</label>
                  {isConfirmed ? (
                    <div className="text-sm font-medium">{order.customerName}</div>
                  ) : (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Telephone</label>
                  {isConfirmed ? (
                    <div className="text-sm font-medium">{order.customerPhone}</div>
                  ) : (
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900"
                    />
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Adresse</label>
                  {isConfirmed ? (
                    <div className="text-sm font-medium">{order.customerAddress}</div>
                  ) : (
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ville (Shopify)</label>
                  <div className="text-sm font-medium text-gray-400">{order.customerCity}</div>
                </div>
              </div>
            </div>

            {/* Products - with editable price */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wider mb-3">Produits</h3>
              <div className="space-y-2">
                {editProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm bg-white rounded-lg p-3">
                    {/* Product Image */}
                    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {p.image ? (
                        <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{p.title}</div>
                      {p.variant && <div className="text-gray-500 text-xs">{p.variant}</div>}
                      {p.sku && <div className="text-gray-400 font-mono text-xs mt-0.5">SKU: {p.sku}</div>}
                    </div>
                    {/* Price & Quantity */}
                    <div className="text-right flex-shrink-0">
                      {isConfirmed ? (
                        <div className="font-medium">{p.price} {order.currency}</div>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={p.price}
                          onChange={(e) => updateProductPrice(i, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm text-right font-medium focus:ring-2 focus:ring-blue-400 text-gray-900"
                        />
                      )}
                      <div className="text-gray-500 text-xs">x{p.quantity}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Total */}
              <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center font-bold">
                <span>Total</span>
                {isConfirmed ? (
                  <span>{order.totalPrice} {order.currency}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editTotalPrice}
                      onChange={(e) => setEditTotalPrice(e.target.value)}
                      className="w-28 px-2 py-1 border border-gray-200 rounded text-sm text-right font-bold focus:ring-2 focus:ring-blue-400 text-gray-900"
                    />
                    <span className="text-sm">{order.currency}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sendit Fee */}
            {order.senditFee !== null && (
              <div className="bg-orange-50 rounded-xl p-4 flex justify-between items-center">
                <span className="text-orange-700 font-medium">Frais de livraison (Sendit)</span>
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
                Imprimer le bon
              </a>
            )}

            {/* District Selection (for new orders) */}
            {!isConfirmed && (
              <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-yellow-800 text-sm uppercase tracking-wider">
                  Ville de livraison Sendit (Obligatoire)
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    value={districtSearch}
                    onChange={(e) => searchDistricts(e.target.value)}
                    onFocus={() => districts.length > 0 && setShowDistrictDropdown(true)}
                    placeholder="Rechercher une ville... (ex: Casablanca)"
                    className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900"
                  />
                  {showDistrictDropdown && districts.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                      {districts.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => {
                            setSelectedDistrict(d.id);
                            setDistrictSearch(`${d.name}`);
                            setShowDistrictDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-yellow-50 text-sm border-b border-gray-50 last:border-0 ${
                            selectedDistrict === d.id ? "bg-yellow-100 font-medium" : ""
                          }`}
                        >
                          <span className="font-medium text-gray-900">{d.name}</span>
                          {d.ville !== d.name && <span className="text-gray-500"> ({d.ville})</span>}
                          <span className="text-gray-400 ml-2">{d.price} DH - {d.delais}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedDistrict && (
                  <p className="text-sm text-green-700 font-medium">
                    Ville selectionnee
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
              {isConfirmed ? (
                <div className="flex-1 bg-green-100 text-green-800 font-semibold py-3 px-6 rounded-xl text-center flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commande confirmee
                </div>
              ) : (
                <button
                  onClick={handleConfirm}
                  disabled={confirming || !selectedDistrict}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {confirming ? "Envoi en cours..." : "Confirmer & Envoyer a Sendit"}
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Fermer
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
