"use client";

import { useState, useEffect, useCallback } from "react";
import OrderModal from "./OrderModal";

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
  status: string;
  createdAt: string;
}

const SENDIT_STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  TO_PREPARE: "A preparer",
  NEW_DESTINATION: "A changer",
  TO_PICKUP: "Ramassage",
  PICKEDUP: "Ramasse",
  WAREHOUSE: "Entrepot",
  TRANSIT: "En transit",
  DISTRIBUTED: "Distribue",
  UNREACHABLE: "Injoignable",
  POSTPONED: "Reporte",
  DELIVERING: "En livraison",
  DELIVERED: "Livre",
  CANCELED: "Annule",
  REJECTED: "Refuse",
};

const STATUS_COLORS: Record<string, string> = {
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

const SENDIT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  TO_PREPARE: "bg-yellow-100 text-yellow-700",
  TO_PICKUP: "bg-blue-100 text-blue-700",
  PICKEDUP: "bg-blue-200 text-blue-800",
  WAREHOUSE: "bg-purple-100 text-purple-700",
  TRANSIT: "bg-indigo-100 text-indigo-700",
  DISTRIBUTED: "bg-violet-100 text-violet-700",
  DELIVERING: "bg-cyan-100 text-cyan-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELED: "bg-red-100 text-red-700",
  REJECTED: "bg-red-200 text-red-800",
  UNREACHABLE: "bg-orange-100 text-orange-700",
  POSTPONED: "bg-amber-100 text-amber-700",
  NEW_DESTINATION: "bg-pink-100 text-pink-700",
};

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingStatus, setSyncingStatus] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSyncShopify = async () => {
    setSyncing(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/shopify/sync-orders", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Synced: ${data.created} new, ${data.skipped} existing`);
        fetchOrders();
      } else {
        setSyncMessage(`Error: ${data.error}`);
      }
    } catch {
      setSyncMessage("Failed to sync");
    }
    setSyncing(false);
  };

  const handleSyncStatus = async () => {
    setSyncingStatus(true);
    setSyncMessage("");
    try {
      const res = await fetch("/api/sync-status", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSyncMessage(`Updated ${data.synced} order statuses`);
        fetchOrders();
      } else {
        setSyncMessage(`Error: ${data.error}`);
      }
    } catch {
      setSyncMessage("Failed to sync statuses");
    }
    setSyncingStatus(false);
  };

  const getProductSummary = (productsJson: string) => {
    try {
      const products = JSON.parse(productsJson);
      return products
        .map((p: { title: string; quantity: number }) => `${p.title} x${p.quantity}`)
        .join(", ");
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search orders, clients, phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 bg-white"
          >
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="confirmed">Confirmed</option>
            <option value="shipped">Shipped</option>
            <option value="delivering">Delivering</option>
            <option value="delivered">Delivered</option>
            <option value="canceled">Canceled</option>
            <option value="rejected">Rejected</option>
            <option value="issue">Issue</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSyncShopify}
            disabled={syncing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            {syncing ? "Syncing..." : "Sync Shopify"}
          </button>
          <button
            onClick={handleSyncStatus}
            disabled={syncingStatus}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            {syncingStatus ? "Syncing..." : "Sync Sendit Status"}
          </button>
        </div>
      </div>

      {/* Sync Message */}
      {syncMessage && (
        <div className={`text-sm px-4 py-2 rounded-lg ${
          syncMessage.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}>
          {syncMessage}
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-gray-500">
        {total} orders total
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Products</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Sendit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No orders found. Click &quot;Sync Shopify&quot; to import orders.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-gray-900">{order.shopifyOrderNumber}</div>
                      {order.senditCode && (
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{order.senditCode}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                      <div className="text-xs text-gray-400 truncate max-w-[200px]">{order.customerCity}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-gray-600 truncate max-w-[250px]">
                        {getProductSummary(order.products)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-bold text-gray-900">
                        {order.totalPrice} <span className="text-xs font-normal text-gray-500">{order.currency}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {order.senditStatus ? (
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${SENDIT_STATUS_COLORS[order.senditStatus] || "bg-gray-100 text-gray-700"}`}>
                          {SENDIT_STATUS_LABELS[order.senditStatus] || order.senditStatus}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Order Modal */}
      {selectedOrderId && (
        <OrderModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={fetchOrders}
        />
      )}
    </div>
  );
}
