"use client";

import * as React from "react";
import { Plus, Puzzle, FileText, Settings, Search, Eye, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  version: string;
  author: string;
  tags: string[];
}

const initialSkills: Skill[] = [
  { 
    id: "1", 
    name: "example-skill", 
    description: "An example skill template that demonstrates how to create custom skills", 
    enabled: true, 
    category: "Templates",
    version: "1.0.0",
    author: "Your Name",
    tags: ["example", "template"]
  }
];

export default function SkillsPage() {
  const [skills, setSkills] = React.useState<Skill[]>(initialSkills);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [showViewDialog, setShowViewDialog] = React.useState<Skill | null>(null);
  const [search, setSearch] = React.useState("");
  const [newSkillName, setNewSkillName] = React.useState("");
  const [newSkillDescription, setNewSkillDescription] = React.useState("");
  const [newSkillCategory, setNewSkillCategory] = React.useState("");

  const filteredSkills = skills.filter(skill =>
    skill.name.toLowerCase().includes(search.toLowerCase()) ||
    skill.description.toLowerCase().includes(search.toLowerCase()) ||
    skill.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSkill = (id: string) => {
    setSkills(skills.map(skill =>
      skill.id === id ? { ...skill, enabled: !skill.enabled } : skill
    ));
  };

  const deleteSkill = (id: string) => {
    setSkills(skills.filter(skill => skill.id !== id));
  };

  const createSkill = () => {
    if (!newSkillName.trim()) return;
    
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: newSkillName.toLowerCase().replace(/\s+/g, '-'),
      description: newSkillDescription,
      enabled: true,
      category: newSkillCategory || "Uncategorized",
      version: "1.0.0",
      author: "User",
      tags: []
    };
    
    setSkills([...skills, newSkill]);
    setShowCreateDialog(false);
    setNewSkillName("");
    setNewSkillDescription("");
    setNewSkillCategory("");
  };

  return (
    <div className="h-full bg-white overflow-hidden flex flex-col">
      <div className="p-6 border-b border-manulife-lightGrey">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Skill Center</h1>
            <p className="text-manulife-grey mt-1">Manage and configure available Skills</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-manulife-grey" />
              <Input
                placeholder="Search Skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 border-manulife-lightGrey"
              />
            </div>
            <Button 
              className="bg-manulife-green hover:bg-manulife-green/90 text-white" 
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {filteredSkills.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-manulife-lightGrey flex items-center justify-center mx-auto mb-4">
                <Puzzle className="w-8 h-8 text-manulife-grey" />
              </div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">No Skills Found</h2>
              <p className="text-manulife-grey mb-4">Create your first skill to get started</p>
              <Button 
                className="bg-manulife-green hover:bg-manulife-green/90 text-white" 
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Skill
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSkills.map((skill) => (
                <Card key={skill.id} className="p-5 border border-manulife-lightGrey hover:border-manulife-green/50 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-manulife-lightGrey flex items-center justify-center">
                      <Puzzle className="w-5 h-5 text-manulife-green" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-manulife-grey">
                        {skill.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <Switch 
                        checked={skill.enabled} 
                        onCheckedChange={() => toggleSkill(skill.id)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{skill.name}</h3>
                    <Badge 
                      variant="outline" 
                      className="text-xs border-manulife-lightGrey text-manulife-grey"
                    >
                      {skill.category}
                    </Badge>
                  </div>

                  <p className="text-sm text-manulife-grey mb-3">{skill.description}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {skill.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs border-manulife-lightGrey bg-manulife-lightGreyBg text-manulife-grey">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-manulife-grey">v{skill.version}</span>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-manulife-grey hover:text-gray-900 hover:bg-manulife-lightGreyBg"
                        onClick={() => setShowViewDialog(skill)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => deleteSkill(skill.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <Card 
                className="p-5 border-2 border-dashed border-manulife-lightGrey flex flex-col items-center justify-center text-center cursor-pointer hover:border-manulife-green/50 hover:bg-manulife-lightGreyBg/50 transition-colors"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className="w-10 h-10 bg-manulife-lightGrey flex items-center justify-center mb-3">
                  <Plus className="w-5 h-5 text-manulife-grey" />
                </div>
                <h3 className="font-medium text-gray-700">Create Skill</h3>
                <p className="text-sm text-manulife-grey mt-1">Add a new custom Skill</p>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Skill</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Skill Name</Label>
              <Input 
                placeholder="e.g. my-custom-skill" 
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                className="border-manulife-lightGrey"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Input 
                placeholder="e.g. Development, Operations, Documents..." 
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value)}
                className="border-manulife-lightGrey"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea 
                placeholder="Describe what this skill does and when to use it..." 
                value={newSkillDescription}
                onChange={(e) => setNewSkillDescription(e.target.value)}
                className="border-manulife-lightGrey h-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-manulife-green hover:bg-manulife-green/90 text-white" 
              onClick={createSkill}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showViewDialog && (
        <Dialog open={!!showViewDialog} onOpenChange={() => setShowViewDialog(null)}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{showViewDialog.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-manulife-grey">Version</Label>
                  <p className="font-medium">v{showViewDialog.version}</p>
                </div>
                <div>
                  <Label className="text-manulife-grey">Author</Label>
                  <p className="font-medium">{showViewDialog.author}</p>
                </div>
                <div>
                  <Label className="text-manulife-grey">Category</Label>
                  <p className="font-medium">{showViewDialog.category}</p>
                </div>
                <div>
                  <Label className="text-manulife-grey">Status</Label>
                  <p className="font-medium">
                    {showViewDialog.enabled ? (
                      <span className="text-manulife-green">Enabled</span>
                    ) : (
                      <span className="text-manulife-grey">Disabled</span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-manulife-grey">Description</Label>
                <p>{showViewDialog.description}</p>
              </div>

              {showViewDialog.tags.length > 0 && (
                <div>
                  <Label className="text-manulife-grey">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {showViewDialog.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="border-manulife-lightGrey bg-manulife-lightGreyBg text-manulife-grey">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowViewDialog(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
