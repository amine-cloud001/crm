"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [districtError, setDistrictError] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [districtSearch, setDistrictSearch] = useState("");
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [districtPage, setDistrictPage] = useState(1);
  const [districtLastPage, setDistrictLastPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch districts from Sendit API (paginated, with optional search)
  const fetchDistricts = useCallback(async (search?: string, page = 1, append = false) => {
    setLoadingDistricts(true);
    setDistrictError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/sendit-cities?${params}`);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setDistrictError("Erreur serveur - redemarrez l'application");
        setLoadingDistricts(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        if (append) {
          setDistricts((prev) => [...prev, ...data.data]);
        } else {
          setDistricts(data.data);
        }
        setDistrictPage(data.currentPage);
        setDistrictLastPage(data.lastPage);
      } else {
        setDistrictError(data.error || "Erreur de chargement");
      }
    } catch (err) {
      setDistrictError("Impossible de charger les villes: " + String(err));
    }
    setLoadingDistricts(false);
  }, []);

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

  // Search with debounce
  const handleDistrictSearch = (query: string) => {
    setDistrictSearch(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchDistricts(query || undefined, 1);
    }, 300);
  };

  const loadMoreDistricts = () => {
    if (districtPage < districtLastPage && !loadingDistricts) {
      fetchDistricts(districtSearch || undefined, districtPage + 1, true);
    }
  };

  const openDistrictPicker = () => {
    setDistrictSearch("");
    setShowDistrictPicker(true);
    fetchDistricts(undefined, 1);
    setTimeout(() => searchInputRef.current?.focus(), 100);
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
          district_id: selectedDistrict.id,
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
                <button
                  type="button"
                  onClick={openDistrictPicker}
                  className={`w-full text-left px-4 py-2.5 border rounded-lg flex items-center justify-between transition-colors ${
                    selectedDistrict
                      ? "border-green-300 bg-green-50"
                      : "border-yellow-300 bg-white hover:border-yellow-400"
                  }`}
                >
                  {selectedDistrict ? (
                    <div>
                      <span className="font-medium text-gray-900">{selectedDistrict.name}</span>
                      <span className="text-gray-400 ml-2 text-sm">{selectedDistrict.price} DH - {selectedDistrict.delais}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">Cliquer pour choisir une ville...</span>
                  )}
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            )}

            {/* District Picker Overlay */}
            {showDistrictPicker && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                  {/* Picker Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Choisir la ville</h3>
                      <button
                        onClick={() => setShowDistrictPicker(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {/* Search bar */}
                    <div className="relative">
                      <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={districtSearch}
                        onChange={(e) => handleDistrictSearch(e.target.value)}
                        placeholder="Rechercher une ville..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                  {/* District List */}
                  <div className="overflow-y-auto flex-1">
                    {districtError ? (
                      <div className="p-8 text-center">
                        <div className="text-red-500 text-sm mb-2">{districtError}</div>
                        <button
                          onClick={() => fetchDistricts(districtSearch || undefined, 1)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Reessayer
                        </button>
                      </div>
                    ) : districts.length === 0 && loadingDistricts ? (
                      <div className="p-8 text-center text-gray-400 text-sm">Chargement des villes...</div>
                    ) : districts.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm">Aucune ville trouvee</div>
                    ) : (
                      <>
                        {districts.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => {
                              setSelectedDistrict(d);
                              setShowDistrictPicker(false);
                            }}
                            className={`w-full text-left px-4 py-3 flex items-center justify-between border-b border-gray-50 hover:bg-yellow-50 transition-colors ${
                              selectedDistrict?.id === d.id ? "bg-yellow-100" : ""
                            }`}
                          >
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{d.name}</div>
                              {d.ville !== d.name && (
                                <div className="text-xs text-gray-400">{d.ville}</div>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-medium text-gray-700">{d.price} DH</div>
                              <div className="text-xs text-gray-400">{d.delais}</div>
                            </div>
                          </button>
                        ))}
                        {districtPage < districtLastPage && (
                          <button
                            onClick={loadMoreDistricts}
                            disabled={loadingDistricts}
                            className="w-full py-3 text-center text-sm text-blue-600 hover:bg-blue-50 font-medium"
                          >
                            {loadingDistricts ? "Chargement..." : "Charger plus de villes..."}
                          </button>
                        )}
                        {loadingDistricts && districts.length > 0 && (
                          <div className="py-2 text-center text-gray-400 text-xs">Chargement...</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
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
