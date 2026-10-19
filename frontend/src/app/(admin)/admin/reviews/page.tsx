"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  BadgeCheck,
  XCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { reviewApi, type Review, type ReviewStats } from "@/lib/api";

const statusBadge: Record<string, string> = {
  approved: "bg-green-100 text-green-800 hover:bg-green-100",
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
};

const PAGE_SIZE = 10;

function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= value ? "currentColor" : "none"}
          className={i <= value ? "text-yellow-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewReview, setViewReview] = useState<Review | null>(null);
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await reviewApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: query || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        rating: ratingFilter !== "all" ? ratingFilter : undefined,
      });
      if (data.success) {
        setReviews(data.reviews);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter, ratingFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await reviewApi.getStats();
      if (data.success) setStats(data.stats);
    } catch {
      // stats are best-effort
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleUpdate = async (
    id: string,
    patch: { status?: string; featured?: boolean }
  ) => {
    try {
      await reviewApi.update(id, patch);
      if (patch.status) toast.success(`Review marked ${patch.status}`);
      if (patch.featured !== undefined) {
        toast.success(patch.featured ? "Review featured" : "Review unfeatured");
      }
      fetchReviews();
      fetchStats();
    } catch {
      toast.error("Failed to update review");
    }
  };

  const handleDelete = async () => {
    if (!deleteReview) return;
    try {
      await reviewApi.delete(deleteReview._id);
      toast.success("Review deleted");
      setDeleteReview(null);
      fetchReviews();
      fetchStats();
    } catch {
      toast.error("Failed to delete review");
    }
  };

  const statCards = [
    {
      label: "Total Reviews",
      value: stats?.total ?? 0,
      icon: <MessageSquare className="h-8 w-8 text-foreground" />,
    },
    {
      label: "Average Rating",
      value: stats ? stats.averageRating.toFixed(1) : "—",
      icon: <Star className="h-8 w-8 text-yellow-400" />,
    },
    {
      label: "Approved",
      value: stats?.approved ?? 0,
      icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
    },
    {
      label: "Pending",
      value: stats?.pending ?? 0,
      icon: <Clock className="h-8 w-8 text-amber-500" />,
    },
  ];

  const distributionTotal = stats?.total || 0;

  return (
    <div className="px-4 space-y-6">
      <SiteHeader
        title="Reviews"
        description="Moderate customer reviews, manage featured reviews, and keep product ratings healthy."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
              {s.icon}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rating distribution */}
      {stats && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Rating Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.distribution.map((d) => (
              <div key={d.rating} className="flex items-center gap-3">
                <span className="w-6 text-right text-sm font-medium text-muted-foreground">
                  {d.rating}
                </span>
                <Star size={14} className="fill-yellow-400 text-yellow-400" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{
                      width: `${
                        distributionTotal ? (d.count / distributionTotal) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
                  {d.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product, customer or comment..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={ratingFilter}
          onValueChange={(v) => {
            setRatingFilter(v || "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} Star{r > 1 ? "s" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <TableRow key={review._id}>
                  <TableCell>
                    <a
                      href={`/product/${review.product?.slug}`}
                      target="_blank"
                      className="flex items-center gap-3"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {review.product?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={review.product.image}
                            alt={review.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-1 max-w-48 text-sm font-medium">
                        {review.product?.name || "Unknown product"}
                      </span>
                    </a>
                  </TableCell>
                  <TableCell>{review.user?.name || "Guest"}</TableCell>
                  <TableCell>
                    <Stars value={review.rating} />
                  </TableCell>
                  <TableCell className="max-w-64">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {review.comment || "No comment"}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(review.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusBadge[review.status]}
                      variant="secondary"
                    >
                      {review.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {review.featured ? (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                      >
                        Featured
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <div>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open actions</span>
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewReview(review)}>
                          <Eye className="mr-2 h-4 w-4" /> View details
                        </DropdownMenuItem>
                        {review.product && (
                          <a
                            href={`/product/${review.product.slug}`}
                            target="_blank"
                          >
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" /> View on
                              storefront
                            </DropdownMenuItem>
                          </a>
                        )}
                        <DropdownMenuSeparator />
                        {review.status !== "approved" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(review._id, { status: "approved" })
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                          </DropdownMenuItem>
                        )}
                        {review.status !== "pending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(review._id, { status: "pending" })
                            }
                          >
                            <Clock className="mr-2 h-4 w-4" /> Mark pending
                          </DropdownMenuItem>
                        )}
                        {review.status !== "rejected" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(review._id, { status: "rejected" })
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdate(review._id, {
                              featured: !review.featured,
                            })
                          }
                        >
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          {review.featured ? "Remove featured" : "Mark featured"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteReview(review)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {reviews.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + reviews.length} of {total}
        </p>
        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    (p >= page - 1 && p <= page + 1)
                )
                .map((p, idx, arr) => (
                  <PaginationItem key={p}>
                    {idx > 0 && p - arr[idx - 1] > 1 ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(p);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  className={
                    page === totalPages ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>

      {/* View details */}
      <Dialog
        open={!!viewReview}
        onOpenChange={(o) => !o && setViewReview(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review details</DialogTitle>
            <DialogDescription>
              {viewReview?.user?.name || "Guest"} ·{" "}
              {viewReview ? formatDate(viewReview.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewReview && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-md bg-muted p-3">
                <div className="min-w-0">
                  <p className="font-medium line-clamp-1">
                    {viewReview.product?.name || "Unknown product"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {viewReview.product?.slug}
                  </p>
                </div>
                {viewReview.product && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/product/${viewReview.product?.slug}`, "_blank")
                    }
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View product
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Stars value={viewReview.rating} size={16} />
                <Badge
                  className={statusBadge[viewReview.status]}
                  variant="secondary"
                >
                  {viewReview.status}
                </Badge>
                {viewReview.featured && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                  >
                    Featured
                  </Badge>
                )}
              </div>
              <div>
                <div className="mb-1 font-medium">Comment</div>
                <p className="rounded-md bg-muted p-3 leading-relaxed text-muted-foreground">
                  {viewReview.comment || "No comment"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewReview(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteReview}
        onOpenChange={(o) => !o && setDeleteReview(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the{" "}
              {deleteReview?.rating}-star review by{" "}
              <span className="font-medium">
                {deleteReview?.user?.name || "Guest"}
              </span>{" "}
              for{" "}
              <span className="font-medium">
                {deleteReview?.product?.name || "this product"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
