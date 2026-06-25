-- CreateTable
CREATE TABLE "ShopOwner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_subscribed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClothConfig" (
    "id" TEXT NOT NULL,
    "cloth_type" TEXT NOT NULL,
    "default_price" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "ClothConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSalary" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Unpaid',
    "amount" DOUBLE PRECISION NOT NULL,
    "employee_id" TEXT NOT NULL,

    CONSTRAINT "EmployeeSalary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "rent" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "electricity" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomExpense" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "CustomExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "bill_number" TEXT NOT NULL,
    "mobile_number" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measurement_image_path" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "advance_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance_amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Undelivered',
    "delivery_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "cloth_type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_cloth" DOUBLE PRECISION NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "order_id" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopOwner_email_key" ON "ShopOwner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ClothConfig_owner_id_cloth_type_key" ON "ClothConfig"("owner_id", "cloth_type");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_owner_id_mobile_number_key" ON "Customer"("owner_id", "mobile_number");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeSalary_employee_id_month_key" ON "EmployeeSalary"("employee_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_owner_id_month_key" ON "Expense"("owner_id", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Order_owner_id_bill_number_key" ON "Order"("owner_id", "bill_number");

-- AddForeignKey
ALTER TABLE "ClothConfig" ADD CONSTRAINT "ClothConfig_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSalary" ADD CONSTRAINT "EmployeeSalary_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomExpense" ADD CONSTRAINT "CustomExpense_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "ShopOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
