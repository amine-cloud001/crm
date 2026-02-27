import OrdersTable from "@/components/OrdersTable";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900">
                Shopify x Sendit
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Orders
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage orders from Shopify and send them to Sendit for delivery
          </p>
        </div>
        <OrdersTable />
      </main>
    </div>
  );
}
