"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Menu, X, Bell, User, ShoppingCart, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { PublicFooter } from "@/components/layout/public-footer";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export { AnnouncementBar, PublicFooter, Toaster };
