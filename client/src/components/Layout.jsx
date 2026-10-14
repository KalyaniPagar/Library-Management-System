import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

// Shared chrome for all logged-in pages: navbar on top, page below.
export default function Layout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  )
}
