// Dashboard sidebar navigation component
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  FolderKanban,
  Database,
  FileUp,
  BarChart3,
  Code2,
  Server,
  HardDrive,
  BookOpen,
  Layers,
  FileCode2,
  Terminal,
  Zap,
} from "lucide-react";

const navItems = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: BarChart3 },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Buckets", href: "/buckets", icon: Database },
      { label: "Files", href: "/files", icon: FileUp },
    ],
  },
  {
    title: "Tools",
    items: [
      { label: "Infrastructure", href: "/infrastructure", icon: Server },
      { label: "Code Snippets", href: "/snippets", icon: Code2 },
      { label: "Commands", href: "/commands", icon: Zap },
    ],
  },
  {
    title: "Documentation",
    items: [
      { label: "Setup Guide", href: "/docs/setup-guide", icon: Terminal },
      { label: "User Guide", href: "/docs/user-guide", icon: BookOpen },
      { label: "Architecture", href: "/docs/architecture-short", icon: Layers },
      { label: "Full Docs", href: "/docs/architecture-full", icon: FileCode2 },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" />
          <span className="text-base font-semibold tracking-tight">
            Storage Control Room
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        item.href === "/"
                          ? pathname === "/"
                          : pathname === item.href || pathname.startsWith(item.href + "/")
                      }
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Local-only · No hosting
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
