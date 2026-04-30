"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, Settings, Key, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

interface HeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Header({ className, ...props }: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        "flex items-center h-14 px-6 bg-white border-b border-manulife-lightGrey justify-between",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-manulife-green flex items-center justify-center">
          <span className="text-white text-sm font-bold">AI</span>
        </div>
        <span className="font-semibold text-gray-900">Agent Hub</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/settings")}
          className="text-manulife-grey hover:text-gray-900 hover:bg-manulife-lightGreyBg"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="text-manulife-grey hover:text-gray-900 hover:bg-manulife-lightGreyBg"
        >
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 bg-gradient-to-br from-manulife-green to-manulife-green/80 flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Key className="mr-2 h-4 w-4" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
