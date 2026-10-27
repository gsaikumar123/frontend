export type Role = 'Admin' | 'Employee';
export interface Session { token: string; expiresAt: string; name: string; email: string; role: Role }
export interface Product { id: number; name: string; price: number; stock: number }
export type OrderStatus = 'Active' | 'Cancelled';
export interface OrderSummary { id: number; orderNumber: string; createdAt: string; total: number; status: OrderStatus; employeeName: string | null }
export interface OrderItem { productId: number; productName: string; quantity: number; unitPrice: number; lineTotal: number }
export interface OrderDetail extends OrderSummary { cancelledAt: string | null; items: OrderItem[] }
export interface Paged<T> { items: T[]; page: number; pageSize: number; totalCount: number; totalPages: number }
export interface UserRow { id: string; name: string; email: string; status: 'Pending' | 'Approved' | 'Rejected'; createdAt: string }
