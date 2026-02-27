"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    shopify_store_url: "",
    shopify_access_token: "",
    sendit_email: "",
    sendit_password: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (data.success) {
          setSettings((prev) => ({ ...prev, ...data.data }));
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("Settings saved successfully!");
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage("Failed to save settings");
    }

    setSaving(false);
  };

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/shopify/webhook`
    : "/api/shopify/webhook";

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
                className="text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                Orders
              </Link>
              <Link
                href="/settings"
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure your Shopify and Sendit API credentials
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Shopify Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center">
                  <span className="text-green-700 text-xs font-bold">S</span>
                </span>
                Shopify Configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Store URL
                  </label>
                  <input
                    type="url"
                    value={settings.shopify_store_url}
                    onChange={(e) =>
                      setSettings({ ...settings, shopify_store_url: e.target.value })
                    }
                    placeholder="https://your-store.myshopify.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Your Shopify store URL (e.g. https://mystore.myshopify.com)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access Token
                  </label>
                  <input
                    type="password"
                    value={settings.shopify_access_token}
                    onChange={(e) =>
                      setSettings({ ...settings, shopify_access_token: e.target.value })
                    }
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Create a custom app in Shopify Admin &gt; Settings &gt; Apps and sales channels &gt; Develop apps
                  </p>
                </div>

                {/* Webhook Info */}
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-green-800 mb-2">Webhook URL</h4>
                  <p className="text-xs text-green-700 mb-2">
                    Add this URL as a webhook in Shopify (Settings &gt; Notifications &gt; Webhooks) for &quot;Order creation&quot;:
                  </p>
                  <code className="block bg-green-100 text-green-900 px-3 py-2 rounded-lg text-xs font-mono break-all">
                    {webhookUrl}
                  </code>
                </div>
              </div>
            </div>

            {/* Sendit Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                  <span className="text-orange-700 text-xs font-bold">D</span>
                </span>
                Sendit Configuration
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.sendit_email}
                    onChange={(e) =>
                      setSettings({ ...settings, sendit_email: e.target.value })
                    }
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={settings.sendit_password}
                    onChange={(e) =>
                      setSettings({ ...settings, sendit_password: e.target.value })
                    }
                    placeholder="Your Sendit password"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                  />
                </div>

                <div className="bg-orange-50 rounded-xl p-4">
                  <p className="text-xs text-orange-700">
                    Use the same email and password you use to log into app.sendit.ma.
                    The app will automatically authenticate and manage tokens.
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                className={`text-sm px-4 py-3 rounded-xl ${
                  message.startsWith("Error")
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {message}
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
