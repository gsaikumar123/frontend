import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, Protected } from './components/Shared';
import { Login, Register } from './pages/AuthPages';
import { CreateOrder, OrderDetails, OrdersList } from './pages/OrderPages';
import { Approvals, CreateEmployee, Products } from './pages/AdminPages';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<Protected />}>
          <Route path="/orders" element={<OrdersList admin={false} />} />
          <Route path="/orders/new" element={<CreateOrder />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Route>
        <Route element={<Protected role="Admin" />}>
          <Route path="/admin/orders" element={<OrdersList admin />} />
          <Route path="/admin/approvals" element={<Approvals />} />
          <Route path="/admin/employees/new" element={<CreateEmployee />} />
          <Route path="/admin/products" element={<Products />} />
        </Route>
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Route>
    </Routes>
  );
}
