-- CreateTable
CREATE TABLE "Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "customerCity" TEXT NOT NULL DEFAULT '',
    "products" TEXT NOT NULL,
    "totalPrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MAD',
    "senditCode" TEXT,
    "senditStatus" TEXT,
    "senditFee" REAL,
    "senditLabelUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "districtId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopifyOrderId_key" ON "Order"("shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");
