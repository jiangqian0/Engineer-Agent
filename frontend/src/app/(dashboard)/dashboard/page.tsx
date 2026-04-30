"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Puzzle, FolderKanban, TrendingUp, Clock, CheckCircle } from "lucide-react";

const stats = [
  { title: "Total Chats", value: "128", change: "+12%", icon: MessageSquare, color: "#002D62" },
  { title: "Active Skills", value: "24", change: "+5", icon: Puzzle, color: "#00693C" },
  { title: "Projects", value: "8", change: "+2", icon: FolderKanban, color: "#4E9C73" },
  { title: "Avg Response Time", value: "1.2s", change: "-0.3s", icon: TrendingUp, color: "#005844" },
];

const recentActivity = [
  { id: 1, action: "Code generation completed", time: "2 minutes ago", status: "success" },
  { id: 2, action: "File structure created", time: "15 minutes ago", status: "success" },
  { id: 3, action: "Skill 'web_searcher' invoked", time: "1 hour ago", status: "success" },
  { id: 4, action: "New project created", time: "2 hours ago", status: "success" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#002D62]">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s what&apos;s happening.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-[#00693C] mt-1">{stat.change} from last month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#002D62]">Recent Activity</CardTitle>
            <CardDescription>Your latest agent activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#00693C]/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-[#00693C]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-[#002D62]">Quick Actions</CardTitle>
            <CardDescription>Common tasks you can perform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start bg-[#00693C] hover:bg-[#005844]">
              <MessageSquare className="mr-2 h-4 w-4" />
              Start New Chat
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Puzzle className="mr-2 h-4 w-4" />
              Browse Skills
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FolderKanban className="mr-2 h-4 w-4" />
              Open Workspace
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
