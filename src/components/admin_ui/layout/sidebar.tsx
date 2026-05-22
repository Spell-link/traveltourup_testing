"use client"

import React, { useState, useEffect, memo, useMemo, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/admin_ui/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/admin_ui/ui/collapsible"
import {
  Home,
  FileText,
  Eye,
  Plus,
  ChevronLeft,
  ChevronDown,
  Menu,
  X,
  Plane,
  Hotel,
  Car,
  PlaneTakeoff,
  CalendarCheck,
  Users,
  Shield,
  Heart,
} from "lucide-react"
import { ResizableSidebar } from "../shared/resizable-sidebar"


type MenuSubItem = {
  title: string
  href: string
  icon: React.ElementType
  allowedResource?: string
  allowedActions?: string[]
}

type MenuItem = {
  title: string
  href: string
  icon: React.ElementType
  badge: null | string
  subItems?: MenuSubItem[]
  allowedResource?: string
  allowedActions?: string[]
}

type MenuSection = {
  title: string
  items: MenuItem[]
}

function menuItemIsActive(pathname: string | null | undefined, item: MenuItem): boolean {
  if (!pathname) return false
  if (item.subItems?.some((sub) => pathname === sub.href)) return true
  if (item.href === "/admin") return pathname === "/admin"
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

const menuItems: MenuSection[] = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        icon: Home,
        badge: null,
      },
    ],
  },
  {
    title: "Catalog",
    items: [
      {
        title: "Hotels",
        href: "/admin/hotels",
        icon: Hotel,
        badge: null,
      },
      {
        title: "Cars",
        href: "/admin/cars",
        icon: Car,
        badge: null,
      },
      {
        title: "Flights",
        href: "/admin/flights",
        icon: PlaneTakeoff,
        badge: null,
        subItems: [
          {
            title: "Flight bookings",
            href: "/admin/flights",
            icon: Eye,
          },
          {
            title: "Revenue",
            href: "/admin/flights/revenue",
            icon: Eye,
          },
          {
            title: "Financial ledger",
            href: "/admin/flights/ledger",
            icon: Plane,
          },
          {
            title: "Pricing rules",
            href: "/admin/flights/pricing-rules",
            icon: Eye,
          },
          {
            title: "Orphan PIT",
            href: "/admin/flights/orphan-pit",
            icon: Eye,
          },
          {
            title: "Webhooks",
            href: "/admin/flights/webhooks",
            icon: Eye,
          },
        ],
      },
    ],
  },
  {
    title: "Content",
    items: [
      {
        title: "Blog",
        href: "/admin/blogs",
        icon: FileText,
        badge: null,
        subItems: [
          {
            title: "All posts",
            href: "/admin/blogs",
            icon: Eye,
          },
          {
            title: "New post",
            href: "/admin/blogs/new",
            icon: Plus,
          },
        ],
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        title: "Bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
        badge: null,
      },
     
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Users",
        href: "/admin/users",
        icon: Users,
        badge: null,
        allowedResource: "admin.users",
        allowedActions: ["read"],
        subItems: [
          {
            title: "All users",
            href: "/admin/users",
            icon: Eye,
            allowedResource: "admin.users",
            allowedActions: ["read"],
          },
          {
            title: "New user",
            href: "/admin/users/new",
            icon: Plus,
            allowedResource: "admin.users",
            allowedActions: ["write"],
          },
          {
            title: "Wishlists",
            href: "/admin/wishlists",
            icon: Heart,
          },
        ],
      },
      {
        title: "Roles & Permissions",
        href: "/admin/roles",
        icon: Shield,
        badge: null,
        allowedResource: "admin.roles",
        allowedActions: ["read"],
        subItems: [
          {
            title: "All roles",
            href: "/admin/roles",
            icon: Eye,
            allowedResource: "admin.roles",
            allowedActions: ["read"],
          },
          {
            title: "New role",
            href: "/admin/roles/new",
            icon: Plus,
            allowedResource: "admin.roles",
            allowedActions: ["write"],
          },
        ],
      },
    ],
  },
]

interface SidebarProps {
  className?: string
}

function usePermissions(): Set<string> | null {
  const [perms, setPerms] = useState<Set<string> | null>(null)
  useEffect(() => {
    fetch("/api/v1/me/authz", { credentials: "include" })
      .then((r) => r.json())
      .then((d: { data?: { permissionSlugs?: string[] } }) => {
        const slugs = d.data?.permissionSlugs
        if (Array.isArray(slugs)) {
          setPerms(new Set(slugs))
        }
      })
      .catch(() => { /* noop */ })
  }, [])
  return perms
}

function isItemVisible(
  item: { allowedResource?: string; allowedActions?: string[] },
  perms: Set<string> | null,
): boolean {
  if (!item.allowedResource || !item.allowedActions?.length) return true
  if (!perms) return true
  return item.allowedActions.some((action) =>
    perms.has(`${item.allowedResource}:${action}`),
  )
}

export const Sidebar = memo(function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const perms = usePermissions()

  const visibleMenuItems = useMemo(() => {
    return menuItems
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => isItemVisible(item, perms))
          .map((item) => ({
            ...item,
            subItems: item.subItems?.filter((sub) => isItemVisible(sub, perms)),
          })),
      }))
      .filter((section) => section.items.length > 0)
  }, [perms])

  const isCommunicationsRoute = useMemo(() =>
    pathname?.startsWith("/communications") || pathname?.startsWith("/client-portal"),
    [pathname]
  )

  const [collapsed, setCollapsed] = useState(isCommunicationsRoute)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [isDesktop, setIsDesktop] = useState(false)


  // Handle desktop detection for resizable sidebar
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])



  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024
      if (isMobile) {
        setCollapsed(false) // On mobile, always show full sidebar when open
        setMobileOpen(false) // Close mobile sidebar on resize
      } else {
        setCollapsed(window.innerWidth < 1280) // Auto-collapse on medium screens
      }
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Open parent sections when the current route matches a sub-item (e.g. Wishlists under Users)
  useEffect(() => {
    if (!pathname) return
    for (const section of menuItems) {
      for (const item of section.items) {
        if (item.subItems?.some((sub) => sub.href === pathname)) {
          setExpandedItems((prev) =>
            prev.includes(item.title) ? prev : [...prev, item.title],
          )
        }
      }
    }
  }, [pathname])

  // Collapse sidebar for communications routes
  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    if (isMobile || isCommunicationsRoute) {
      setCollapsed(false) // On mobile, always show full sidebar when open
      setMobileOpen(false)
    }
  }, [pathname])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileOpen])

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(item => item !== title)
        : [...prev, title]
    )
  }

  const isItemExpanded = (title: string) => expandedItems.includes(title)

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen)
  }

  const toggleCollapsed = () => {
    setCollapsed(!collapsed)
  }

  const translateClass = mobileOpen ? "translate-x-0" : (isCommunicationsRoute ? "-translate-x-full" : "-translate-x-full lg:translate-x-0")

  const isWrapped = isDesktop && !isCommunicationsRoute

  const sidebarClassName = cn(
    "sidebar flex min-h-0 flex-col bg-muted backdrop-blur-sm transition-all duration-300 ease-in-out",
    isCommunicationsRoute
      ? "fixed z-50 h-dvh max-h-dvh"
      : cn(
          "max-lg:fixed max-lg:top-0 max-lg:left-0 max-lg:z-50 max-lg:h-dvh max-lg:max-h-dvh",
          "lg:relative lg:z-auto lg:h-full lg:max-h-full",
        ),
    translateClass,
    isWrapped ? "lg:w-auto" : collapsed ? "w-16" : "w-72",
    className,
  )

  const sidebarContent = (

    <div className={sidebarClassName}>

      {/* Header */}

      <div className="flex h-16 gap-2 items-center justify-between border-b border-border bg-gradient-to-r from-sidebar/98 to-sidebar-accent/5 backdrop-blur-sm px-3  shrink-0 shadow-sm">

        {!collapsed && (

          <Link href="/admin" className="flex items-center space-x-3 min-w-0 group">

            <div className="flex h-9 w-12 items-center justify-center shrink-0 rounded-lg bg-primary/15 transition-transform duration-300 group-hover:scale-110">

              <Plane className="h-6 w-6 text-primary" aria-hidden />

            </div>

            <div className="min-w-0">

              <div className="text-lg font-bold tracking-tight text-sidebar-foreground truncate transition-colors duration-300 group-hover:text-primary">

                TravelTourUp

              </div>

              <div className="text-xs text-muted-foreground/70 font-medium truncate transition-colors duration-300 group-hover:text-sidebar-foreground/80">

                Admin

              </div>

            </div>

          </Link>

        )}

        {/* Desktop toggle button */}

        <Button

          variant="ghost"

          size="sm"

          onClick={toggleCollapsed}

          className={cn(

            "p-0 hover:bg-primary hover:shadow-md transition-all duration-300 shrink-0 hover:scale-110",

            collapsed ? "h-9 w-9" : "h-8 w-8",

            "hidden",

            !isCommunicationsRoute && "lg:flex"

          )}

        >

          <ChevronLeft className={cn(

            "transition-transform duration-300",

            collapsed ? "h-9 w-9" : "h-4 w-4",

            collapsed && "rotate-180"

          )} />

        </Button>

        {/* Mobile close button */}

        <Button

          variant="ghost"

          size="sm"

          onClick={() => setMobileOpen(false)}

          className={`h-9 w-9 p-0 hover:bg-primary hover:shadow-md transition-all duration-300 ${isCommunicationsRoute ? '' : 'lg:hidden'} shrink-0 hover:scale-110`}

        >

          <X className="h-4 w-4" />

        </Button>

      </div>

      {/* Navigation: overflow-y-auto + basis-0 so small-screen drawer scrolls when menu exceeds viewport */}
      <div
        className="min-h-0 flex-1 basis-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-3 py-4 dropdown-scrollbar"
      >
        <nav className="space-y-6" aria-label="Admin navigation">

            {visibleMenuItems.map((section, sectionIndex) => {

        

              return (

                <div key={sectionIndex} className="space-y-2">

                  {!collapsed && (

                    <div className="flex items-center px-3 pb-2">

                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">

                        {section.title}

                      </h3>

                      <div className="ml-3 flex-1 border-t border-sidebar-border" />

                    </div>

                  )}

                  <div className="space-y-1">

                    {section.items.map((item, itemIndex) => {

                      const isActive = menuItemIsActive(pathname, item)

                      const isExpanded = isItemExpanded(item.title)

                      // Filter accessible sub-items

                      const accessibleSubItems = item.subItems

                      const hasSubItems = item.subItems && item.subItems.length > 0

                      return (

                        <div key={itemIndex}>

                          {hasSubItems && !collapsed ? (

                            <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(item.title)}>

                              <CollapsibleTrigger asChild>

                                <div

                                  className={cn(

                                    "group flex w-full items-center rounded-lg px-2 py-2 text-sm font-medium transition-all duration-300 cursor-pointer",

                                    "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/50 hover:shadow-lg hover:scale-[1.02] hover:border-sidebar-accent/20",

                                    "border border-transparent",

                                    isActive

                                      ? "bg-gradient-to-r from-primary/10 via-sidebar-accent to-sidebar-accent/60 text-sidebar-accent-foreground shadow-lg font-semibold border-sidebar-accent/30"

                                      : "text-sidebar-foreground hover:text-sidebar-accent-foreground",

                                  )}

                                >

                                  <div className={cn(

                                    "flex h-6 w-6 items-center justify-center rounded-lg transition-all duration-300 mr-3 shrink-0",

                                    "transform group-hover:scale-110 group-hover:rotate-3",

                                    isActive

                                      ? "bg-primary/20 text-primary shadow-md ring-2 ring-primary/20"

                                      : "bg-sidebar-accent/20 text-sidebar-foreground/70 group-hover:bg-sidebar-accent/50 group-hover:text-sidebar-foreground group-hover:shadow-md"

                                  )}>

                                    <item.icon className="h-4 w-4" />

                                  </div>

                                  <span className="flex-1 text-left tracking-wide truncate min-w-0">

                                    {item.title}

                                  </span>

                                  {item.badge && (

                                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">

                                      {item.badge}

                                    </span>

                                  )}

                                  <ChevronDown className={cn(

                                    "ml-2 h-4 w-4 transition-transform duration-200 shrink-0",

                                    isExpanded && "rotate-180"

                                  )} />

                                </div>

                              </CollapsibleTrigger>

                              <CollapsibleContent className="space-y-0">

                                <div className="mt-2 ml-5 space-y-1">

                                  {accessibleSubItems?.map((subItem, subIndex) => {

                                    const isSubActive = pathname === subItem.href

                                    return (

                                      <div

                                        key={subIndex}

                                        onClick={() => router.push(subItem.href)}

                                        className={cn(

                                          "group flex items-center rounded-md px-2 py-1.5 text-sm transition-all duration-300 cursor-pointer",

                                          "hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground hover:translate-x-1 hover:shadow-md",

                                          "border-l-2 border-transparent hover:border-sidebar-accent/50",

                                          isSubActive

                                            ? "bg-primary text-white font-medium text-base hover:bg-primary-80 hover:text-primary-foreground border-l-primary shadow-md"

                                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground",

                                        )}

                                      >

                                        <div className={cn(

                                          "flex h-6 w-6 items-center justify-center rounded-md transition-all duration-300 mr-3 shrink-0",

                                          "transform group-hover:scale-110",

                                          isSubActive

                                            ? "bg-primary/20 text-white shadow-sm ring-1 ring-primary/30"

                                            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground group-hover:bg-sidebar-accent/30"

                                        )}>

                                          <subItem.icon className="h-3.5 w-3.5" />

                                        </div>

                                        <span className="tracking-wide truncate min-w-0">

                                          {subItem.title}

                                        </span>

                                      </div>

                                    )

                                  })}

                                </div>

                              </CollapsibleContent>

                            </Collapsible>

                          ) : (

                            true && (

                              <div

                                onClick={() => router.push(item.href)}

                                className={cn(

                                  "group flex items-center rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-300 cursor-pointer",

                                  "hover:bg-gradient-to-r hover:from-sidebar-accent hover:to-sidebar-accent/50 hover:shadow-lg hover:scale-[1.02] hover:border-sidebar-accent/20",

                                  "border border-transparent",

                                  isActive

                                    ? "bg-gradient-to-r from-primary/10 via-sidebar-accent to-sidebar-accent/60 text-sidebar-accent-foreground shadow-lg font-semibold border-sidebar-accent/30"

                                    : "text-sidebar-foreground hover:text-sidebar-accent-foreground",

                                  collapsed && "justify-center px-2",

                                )}

                              >

                                <div className={cn(

                                  "flex items-center justify-center rounded-lg transition-all duration-300 shrink-0",

                                  "transform group-hover:scale-110 group-hover:rotate-3",

                                  collapsed ? "h-6 w-6" : "h-6 w-6 mr-3",

                                  isActive

                                    ? "bg-primary/20 text-primary shadow-md ring-2 ring-primary/20"

                                    : "bg-sidebar-accent/20 text-sidebar-foreground/70 group-hover:bg-sidebar-accent/50 group-hover:text-sidebar-foreground group-hover:shadow-md"

                                )}>

                                  <item.icon className="h-4 w-4" />

                                </div>

                                {!collapsed && (

                                  <div className="flex flex-1 items-center justify-between min-w-0">

                                    <span className="tracking-wide truncate">

                                      {item.title}

                                    </span>

                                    {item.badge && (

                                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">

                                        {item.badge}

                                      </span>

                                    )}

                                  </div>

                                )}

                              </div>

                            )

                          )}

                        </div>

                      )

                    })}

                  </div>

                </div>

              )

            })}

        </nav>
      </div>

    </div>

  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        // variant="ghost"
        // size="sm"
        onClick={toggleMobileSidebar}
        className={`mainCollapserBtn fixed top-4 border-0 left-4 z-50 ${isCommunicationsRoute ? '' : 'lg:hidden'} h-9 w-9 p-0 bg-background/80 backdrop-blur-sm border shadow-sm hover:text-primary transition-all duration-300  flex items-center justify-center hover:scale-110`}
      >
        {mobileOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="3" y="5" width="18" height="3" rx="1.5" />
            <rect x="3" y="10.5" width="10" height="3" rx="1.5" />
            <rect x="3" y="16" width="18" height="3" rx="1.5" />
          </svg>



        )}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 ${isCommunicationsRoute ? '' : 'lg:hidden'}`}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Sticky positioning */}
      {isWrapped ? (
        <ResizableSidebar
          defaultWidth={collapsed ? 64 : 288}
          minWidth={collapsed ? 64 : 200}
          maxWidth={collapsed ? 64 : 500}
          storageKey="main-sidebar"
          className="hidden h-full min-h-0 shrink-0 self-stretch border-r border-border lg:flex"
        >
          {sidebarContent}
        </ResizableSidebar>
      ) : (
        sidebarContent
      )}
    </>
  )
})