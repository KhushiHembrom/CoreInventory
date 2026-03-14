export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  created_at: string | null;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  unit_of_measure: string | null;
  reorder_level: number | null;
  description: string | null;
  created_at: string | null;
}

export interface Stock {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity: number;
  updated_at: string | null;
}

export interface Receipt {
  id: string;
  reference_no: string;
  supplier_name: string | null;
  warehouse_id: string | null;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  validated_at: string | null;
}

export interface ReceiptItem {
  id: string;
  receipt_id: string;
  product_id: string;
  expected_qty: number | null;
  received_qty: number | null;
}

export interface Delivery {
  id: string;
  reference_no: string;
  customer_name: string | null;
  warehouse_id: string | null;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  validated_at: string | null;
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  product_id: string;
  requested_qty: number | null;
  delivered_qty: number | null;
}

export interface InternalTransfer {
  id: string;
  reference_no: string;
  from_warehouse_id: string | null;
  to_warehouse_id: string | null;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  validated_at: string | null;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number | null;
}

export interface StockAdjustment {
  id: string;
  reference_no: string;
  warehouse_id: string | null;
  status: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface AdjustmentItem {
  id: string;
  adjustment_id: string;
  product_id: string;
  recorded_qty: number | null;
  actual_qty: number | null;
  difference: number | null;
}

export interface StockLedgerEntry {
  id: string;
  product_id: string;
  warehouse_id: string;
  operation_type: string;
  reference_no: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  created_by: string | null;
  created_at: string | null;
}

export type DocumentStatus = 'Draft' | 'Waiting' | 'Ready' | 'Done' | 'Canceled';
