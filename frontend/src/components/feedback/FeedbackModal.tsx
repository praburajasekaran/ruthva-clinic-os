"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bug,
  Camera,
  CheckCircle,
  ImagePlus,
  Lightbulb,
  Loader2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { submitFeedback } from "@/lib/api";
import type { FeedbackCategory } from "@/lib/types";

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
};

const CATEGORIES: { value: FeedbackCategory; label: string; icon: typeof Bug }[] = [
  { value: "bug", label: "Bug Report", icon: Bug },
  { value: "feature", label: "Feature Request", icon: Lightbulb },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const pathname = usePathname();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    setFileError("");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(document.body, {
        ignoreElements: (el) =>
          el.closest("[role='dialog']") !== null ||
          el.closest(".no-print") !== null,
      });
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `screenshot-${Date.now()}.png`, {
            type: "image/png",
          });
          setScreenshot(file);
        }
        setIsCapturing(false);
      }, "image/png");
    } catch {
      setFileError("Failed to capture screenshot.");
      setIsCapturing(false);
    }
  };

  const handleFileChange = (file: File | null) => {
    setFileError("");
    if (!file) {
      setScreenshot(null);
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setFileError("Only PNG, JPEG, GIF, and WebP images are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError("Screenshot must be under 5 MB.");
      return;
    }
    setScreenshot(file);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      await submitFeedback({
        category,
        title: title.trim(),
        description: description.trim(),
        screenshot: screenshot ?? undefined,
        page_url: window.location.origin + pathname,
        browser_info: navigator.userAgent.slice(0, 256),
      });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr?.response?.data?.detail ??
        "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCategory("bug");
    setTitle("");
    setDescription("");
    setScreenshot(null);
    setFileError("");
    setError("");
    setSuccess(false);
    setIsLoading(false);
    onClose();
  };

  if (success) {
    return (
      <Modal open={open} onClose={handleClose} title="Feedback Submitted" size="sm">
        <div className="flex flex-col items-center gap-3 py-4">
          <CheckCircle aria-hidden="true" className="h-12 w-12 text-emerald-500" />
          <p className="text-sm text-gray-600">
            Thank you! Your feedback has been submitted.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send Feedback" size="md">
      <div className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Category
          </label>
          <div className="flex gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  category === cat.value
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                <cat.icon className="h-4 w-4" aria-hidden="true" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="feedback-title"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="feedback-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={256}
            placeholder={
              category === "bug"
                ? "What went wrong?"
                : "What would you like to see?"
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="feedback-description"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="feedback-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add more details..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Screenshot upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Screenshot (optional)
          </label>
          {screenshot ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(screenshot)}
                alt="Screenshot preview"
                className="h-16 w-16 rounded object-cover"
              />
              <span className="flex-1 truncate text-sm text-gray-600">
                {screenshot.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setScreenshot(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Remove screenshot"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={captureScreenshot}
                disabled={isCapturing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
              >
                {isCapturing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
                )}
                {isCapturing ? "Capturing…" : "Capture screen"}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-3 text-sm text-gray-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                Upload image
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          {fileError && (
            <p className="mt-1 text-xs text-red-600">{fileError}</p>
          )}
          <p className="mt-1 text-xs text-amber-600">
            Please avoid including patient information in screenshots.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!title.trim() || isLoading}
          >
            {isLoading ? "Submitting…" : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
