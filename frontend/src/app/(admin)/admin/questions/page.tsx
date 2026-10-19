"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  BadgeCheck,
  FileText,
  MessageCircleQuestion,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { questionApi, type Question, type QuestionStats } from "@/lib/api";

const statusBadge: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  answered: "bg-green-100 text-green-800 hover:bg-green-100",
  rejected: "bg-red-100 text-red-800 hover:bg-red-100",
};

const PAGE_SIZE = 10;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [viewQuestion, setViewQuestion] = useState<Question | null>(null);
  const [answerTarget, setAnswerTarget] = useState<Question | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerStatus, setAnswerStatus] = useState("answered");
  const [saving, setSaving] = useState(false);
  const [deleteQuestion, setDeleteQuestion] = useState<Question | null>(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await questionApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: query || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      if (data.success) {
        setQuestions(data.questions);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  }, [page, query, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await questionApi.getStats();
      if (data.success) setStats(data.stats);
    } catch {
      // stats are best-effort
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleUpdate = async (
    id: string,
    patch: { status?: string; featured?: boolean }
  ) => {
    try {
      await questionApi.update(id, patch);
      if (patch.status) toast.success(`Question marked ${patch.status}`);
      if (patch.featured !== undefined) {
        toast.success(patch.featured ? "Question featured" : "Question unfeatured");
      }
      fetchQuestions();
      fetchStats();
    } catch {
      toast.error("Failed to update question");
    }
  };

  const openAnswerDialog = (q: Question) => {
    setAnswerTarget(q);
    setAnswerText(q.answer || "");
    setAnswerStatus(q.status === "rejected" ? "rejected" : "answered");
  };

  const handleSaveAnswer = async () => {
    if (!answerTarget) return;
    try {
      setSaving(true);
      await questionApi.update(answerTarget._id, {
        answer: answerText,
        status: answerStatus,
      });
      toast.success("Answer saved");
      setAnswerTarget(null);
      fetchQuestions();
      fetchStats();
    } catch {
      toast.error("Failed to save answer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteQuestion) return;
    try {
      await questionApi.delete(deleteQuestion._id);
      toast.success("Question deleted");
      setDeleteQuestion(null);
      fetchQuestions();
      fetchStats();
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const statCards = [
    {
      label: "Total Questions",
      value: stats?.total ?? 0,
      icon: <HelpCircle className="h-8 w-8 text-foreground" />,
    },
    {
      label: "Pending",
      value: stats?.pending ?? 0,
      icon: <Clock className="h-8 w-8 text-amber-500" />,
    },
    {
      label: "Answered",
      value: stats?.answered ?? 0,
      icon: <CheckCircle2 className="h-8 w-8 text-green-600" />,
    },
    {
      label: "Rejected",
      value: stats?.rejected ?? 0,
      icon: <XCircle className="h-8 w-8 text-red-600" />,
    },
  ];

  return (
    <div className="px-4 space-y-6">
      <SiteHeader
        title="Questions"
        description="Answer customer questions, manage Q&A visibility, and keep product FAQs healthy."
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

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by product, customer, question or answer..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="answered">Answered</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
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
              <TableHead>Question</TableHead>
              <TableHead>Answer</TableHead>
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
            ) : questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No questions found.
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => (
                <TableRow key={question._id}>
                  <TableCell>
                    <a
                      href={`/product/${question.product?.slug}`}
                      target="_blank"
                      className="flex items-center gap-3"
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {question.product?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={question.product.image}
                            alt={question.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-1 max-w-48 text-sm font-medium">
                        {question.product?.name || "Unknown product"}
                      </span>
                    </a>
                  </TableCell>
                  <TableCell>{question.user?.name || "Guest"}</TableCell>
                  <TableCell className="max-w-64">
                    <p className="line-clamp-2 text-sm font-medium">
                      {question.question}
                    </p>
                  </TableCell>
                  <TableCell className="max-w-64">
                    {question.answer ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {question.answer}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not answered yet
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(question.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={statusBadge[question.status]}
                      variant="secondary"
                    >
                      {question.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {question.featured ? (
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
                        <DropdownMenuItem onClick={() => setViewQuestion(question)}>
                          <Eye className="mr-2 h-4 w-4" /> View details
                        </DropdownMenuItem>
                        {question.product && (
                          <a
                            href={`/product/${question.product.slug}`}
                            target="_blank"
                          >
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" /> View on
                              storefront
                            </DropdownMenuItem>
                          </a>
                        )}
                        <DropdownMenuItem onClick={() => openAnswerDialog(question)}>
                          <MessageCircleQuestion className="mr-2 h-4 w-4" />
                          {question.answer ? "Edit answer" : "Answer"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {question.status !== "answered" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(question._id, { status: "answered" })
                            }
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark answered
                          </DropdownMenuItem>
                        )}
                        {question.status !== "pending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(question._id, { status: "pending" })
                            }
                          >
                            <Clock className="mr-2 h-4 w-4" /> Mark pending
                          </DropdownMenuItem>
                        )}
                        {question.status !== "rejected" && (
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdate(question._id, { status: "rejected" })
                            }
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            handleUpdate(question._id, {
                              featured: !question.featured,
                            })
                          }
                        >
                          <BadgeCheck className="mr-2 h-4 w-4" />
                          {question.featured ? "Remove featured" : "Mark featured"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteQuestion(question)}
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
          Showing {questions.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–
          {(page - 1) * PAGE_SIZE + questions.length} of {total}
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
        open={!!viewQuestion}
        onOpenChange={(o) => !o && setViewQuestion(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Question details</DialogTitle>
            <DialogDescription>
              {viewQuestion?.user?.name || "Guest"} ·{" "}
              {viewQuestion ? formatDate(viewQuestion.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {viewQuestion && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-md bg-muted p-3">
                <div className="min-w-0">
                  <p className="font-medium line-clamp-1">
                    {viewQuestion.product?.name || "Unknown product"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {viewQuestion.product?.slug}
                  </p>
                </div>
                {viewQuestion.product && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(`/product/${viewQuestion.product?.slug}`, "_blank")
                    }
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View product
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={statusBadge[viewQuestion.status]}
                  variant="secondary"
                >
                  {viewQuestion.status}
                </Badge>
                {viewQuestion.featured && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                  >
                    Featured
                  </Badge>
                )}
              </div>
              <div>
                <div className="mb-1 font-medium">Question</div>
                <p className="rounded-md bg-muted p-3 leading-relaxed text-muted-foreground">
                  {viewQuestion.question}
                </p>
              </div>
              <div>
                <div className="mb-1 font-medium">Answer</div>
                {viewQuestion.answer ? (
                  <p className="rounded-md bg-green-50 p-3 leading-relaxed text-green-900">
                    {viewQuestion.answer}
                    <span className="mt-2 block text-xs text-green-700">
                      Answered by {viewQuestion.answeredBy?.name || "—"} ·{" "}
                      {formatDate(viewQuestion.answeredAt)}
                    </span>
                  </p>
                ) : (
                  <p className="rounded-md bg-muted p-3 text-muted-foreground">
                    Not answered yet.
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewQuestion(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer dialog */}
      <Dialog
        open={!!answerTarget}
        onOpenChange={(o) => !o && setAnswerTarget(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {answerTarget?.answer ? "Edit answer" : "Answer question"}
            </DialogTitle>
            <DialogDescription>
              {answerTarget?.user?.name || "Guest"} asked about{" "}
              {answerTarget?.product?.name || "a product"}
            </DialogDescription>
          </DialogHeader>
          {answerTarget && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                {answerTarget.question}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="answer">Your answer</Label>
                <Textarea
                  id="answer"
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write a helpful answer..."
                  rows={4}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={answerStatus}
                  onValueChange={(v) => setAnswerStatus(v || "answered")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAnswerTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAnswer} disabled={saving}>
              {saving ? "Saving..." : "Save answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog
        open={!!deleteQuestion}
        onOpenChange={(o) => !o && setDeleteQuestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the question by{" "}
              <span className="font-medium">
                {deleteQuestion?.user?.name || "Guest"}
              </span>{" "}
              for{" "}
              <span className="font-medium">
                {deleteQuestion?.product?.name || "this product"}
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
