import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Cloud,
  Upload,
  FolderOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Image,
  Sparkles,
  Map,
  User,
  Palette,
  BookOpen,
} from "lucide-react";

interface ImageCategory {
  name: string;
  basePath: string;
  cacheControl: string;
  description: string;
}

interface UploadJob {
  id: string;
  localPath: string;
  cloudPath: string;
  category: string;
  status: "pending" | "uploading" | "completed" | "failed";
  error?: string;
  progress: number;
  createdAt: number;
  completedAt?: number;
}

interface QueueStats {
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sprites: <Sparkles className="w-4 h-4" />,
  lore: <BookOpen className="w-4 h-4" />,
  ui: <Palette className="w-4 h-4" />,
  avatars: <User className="w-4 h-4" />,
  maps: <Map className="w-4 h-4" />,
  generated: <Image className="w-4 h-4" />,
};

export function ImageStorageManager() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Record<string, ImageCategory>>({});
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [stats, setStats] = useState<QueueStats>({ pending: 0, uploading: 0, completed: 0, failed: 0 });
  const [images, setImages] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/images/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (!selectedCategory && Object.keys(data).length > 0) {
          setSelectedCategory(Object.keys(data)[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  }, [selectedCategory]);

  const loadJobs = useCallback(async () => {
    try {
      const [jobsRes, statsRes] = await Promise.all([
        fetch("/api/images/queue/jobs"),
        fetch("/api/images/queue/stats"),
      ]);

      if (jobsRes.ok) {
        setJobs(await jobsRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error("Failed to load queue:", error);
    }
  }, []);

  const loadImages = useCallback(async (category: string) => {
    if (!category) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/images/list/${category}`);
      if (res.ok) {
        const data = await res.json();
        setImages(prev => ({ ...prev, [category]: data }));
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadJobs();
    
    const interval = setInterval(loadJobs, 2000);
    return () => clearInterval(interval);
  }, [loadCategories, loadJobs]);

  useEffect(() => {
    if (selectedCategory) {
      loadImages(selectedCategory);
    }
  }, [selectedCategory, loadImages]);

  const handleMigrateSprites = async () => {
    setIsMigrating(true);
    try {
      const res = await fetch("/api/images/migrate/sprites", { method: "POST" });
      const data = await res.json();
      
      if (res.ok) {
        toast({
          title: "Migration Started",
          description: data.message,
        });
        loadJobs();
      } else {
        toast({
          title: "Migration Failed",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Migration Failed",
        description: "Failed to start sprite migration",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearCompleted = async () => {
    try {
      await fetch("/api/images/queue/clear", { method: "POST" });
      loadJobs();
    } catch (error) {
      console.error("Failed to clear queue:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold text-white">Image Storage Manager</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadJobs()}
            data-testid="button-refresh-queue"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleMigrateSprites}
            disabled={isMigrating}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-migrate-sprites"
          >
            {isMigrating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Migrate All Sprites
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Loader2 className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.pending}</p>
              <p className="text-xs text-slate-400">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Upload className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.uploading}</p>
              <p className="text-xs text-slate-400">Uploading</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.completed}</p>
              <p className="text-xs text-slate-400">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.failed}</p>
              <p className="text-xs text-slate-400">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="queue">Upload Queue ({jobs.length})</TabsTrigger>
          <TabsTrigger value="browse">Browse Images</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(categories).map(([key, cat]) => (
              <Card 
                key={key} 
                className={`bg-slate-800/50 border-slate-700 cursor-pointer hover:border-purple-500/50 transition-colors ${selectedCategory === key ? "ring-2 ring-purple-500" : ""}`}
                onClick={() => setSelectedCategory(key)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2">
                    {CATEGORY_ICONS[key] || <FolderOpen className="w-4 h-4" />}
                    <CardTitle className="text-sm text-white">{cat.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{cat.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cache: {cat.cacheControl.split(",")[1]?.trim() || cat.cacheControl}</span>
                    <Badge variant="outline" className="text-xs">
                      {images[key]?.length || 0} files
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queue" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Upload Queue</CardTitle>
              {(stats.completed > 0 || stats.failed > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCompleted}
                  data-testid="button-clear-completed"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Completed
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No uploads in queue</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {jobs.slice(0, 50).map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          {job.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : job.status === "failed" ? (
                            <XCircle className="w-5 h-5 text-red-500" />
                          ) : job.status === "uploading" ? (
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-slate-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{job.localPath.split("/").pop()}</p>
                          <p className="text-xs text-slate-400 truncate">{job.cloudPath}</p>
                          {job.error && (
                            <p className="text-xs text-red-400">{job.error}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {job.category}
                        </Badge>
                        {job.status === "uploading" && (
                          <div className="w-20">
                            <Progress value={job.progress} className="h-1" />
                          </div>
                        )}
                      </div>
                    ))}
                    {jobs.length > 50 && (
                      <p className="text-center text-slate-400 text-sm py-2">
                        ... and {jobs.length - 50} more
                      </p>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="browse" className="mt-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">
                  {categories[selectedCategory]?.name || "Images"} ({images[selectedCategory]?.length || 0})
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadImages(selectedCategory)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : !images[selectedCategory] || images[selectedCategory].length === 0 ? (
                <p className="text-center text-slate-400 py-8">No images in this category</p>
              ) : (
                <ScrollArea className="h-96">
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {images[selectedCategory].map((url, i) => (
                      <div
                        key={i}
                        className="aspect-square bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <img
                          src={url}
                          alt=""
                          className="w-full h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
