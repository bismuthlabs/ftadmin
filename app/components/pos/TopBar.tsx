'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePOS } from '@/app/context/POSContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  BarChart3,
  Clock,
  Menu,
  Moon,
  ReceiptText,
  Settings,
  ShoppingBag,
  Sun,
  Users,
  Warehouse,
} from 'lucide-react'

const navItems = [
  { id: 'pos', label: 'POS', icon: ShoppingBag, href: '/pos' },
  { id: 'orders', label: 'Orders', icon: ReceiptText, href: '/orders' },
  { id: 'tables', label: 'Tables', icon: Users, href: '/tables' },
  { id: 'reports', label: 'Reports', icon: BarChart3, href: '/reports' },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, href: '/inventory' },
  { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
]

export function TopBar() {
  const { isDarkMode, setDarkMode, currentStaff } = usePOS()
  const pathname = usePathname()
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [])

  const activeItem = navItems.find((item) => pathname === item.href) || navItems[0]

  return (
    <nav className="border-b border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 md:px-0 py-3 max-w-7xl mx-auto">
        <div className="flex min-w-0 items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Menu data-icon="inline-start" />
                {activeItem.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Navigate</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href

                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        href={item.href}
                        className={isActive ? 'bg-accent font-semibold' : undefined}
                      >
                        <Icon data-icon="inline-start" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-2 text-slate-700 sm:flex">
            <Clock className="text-blue-600" />
            <span className="text-sm font-medium">{currentTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {currentStaff.name.charAt(0)}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-900">{currentStaff.name}</p>
              <p className="text-xs capitalize text-slate-500">{currentStaff.role}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDarkMode(!isDarkMode)}
            className="text-slate-700 hover:bg-slate-100"
          >
            {isDarkMode ? <Sun className="text-amber-500" /> : <Moon className="text-slate-600" />}
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-700 hover:bg-slate-100">
            <Settings />
          </Button>
        </div>
      </div>
    </nav>
  )
}
