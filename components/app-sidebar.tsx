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
import { Button } from "@/components/ui/button";
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
  Globe,
  Compass,
  MapPin,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useTour } from "@/components/ui/tour";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: BarChart3 }],
  },
  {
    title: "Management",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Buckets", href: "/buckets", icon: Database },
      { label: "Files", href: "/files", icon: FileUp },
      { label: "Distributions", href: "/distributions", icon: Globe },
      { label: "Environments", href: "/environments", icon: MapPin },
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
  const tour = useTour();
  const router = useRouter();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      if (res.ok) {
        toast.success("All local data has been reset");
        setResetOpen(false);
        router.push("/onboarding");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to reset");
      }
    } catch {
      toast.error("Failed to reset data");
    } finally {
      setResetting(false);
    }
  };

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
      <SidebarContent className=" no-scrollbar">
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
                          : pathname === item.href ||
                            pathname.startsWith(item.href + "/")
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
      <SidebarFooter className="border-t px-6 py-3 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-primary"
          onClick={() => tour.start("product-tour")}
        >
          <Compass className="size-3.5" />
          Start Tour
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => setResetOpen(true)}
        >
          <RotateCcw className="size-3.5" />
          Reset Local Data
        </Button>
        <p className="text-xs text-muted-foreground">Local-only · No hosting</p>
      </SidebarFooter>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Local Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all local data (buckets, projects, files,
              environments, and system state) and redirect you to the onboarding
              flow. This does <strong>not</strong> delete anything from AWS — only
              the local JSON metadata is cleared.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Resetting…
                </>
              ) : (
                "Reset Everything"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
}
