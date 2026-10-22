"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Replace,
  UploadCloud,
  X,
} from "lucide-react";

export default function FileUpload({
  label,

  file = null,

  existingUrl = "",

  existingName = "",

  onChange,

  onRemoveExisting,

  accept = "*",

  helperText = "",

  required = false,

  preview = false,

  className = "",
}) {
  const [objectUrl, setObjectUrl] =
    useState("");

  /* ==========================================
      Object URL

      Prevents leaking a new blob URL on
      every render.
  ========================================== */

  useEffect(() => {
    if (!file) {
      setObjectUrl("");

      return;
    }

    const url =
      URL.createObjectURL(file);

    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const hasFile =
    Boolean(file);

  const hasExisting =
    Boolean(
      String(
        existingUrl || ""
      ).trim()
    );

  const hasAnyFile =
    hasFile || hasExisting;

  const imageSource =
    hasFile
      ? objectUrl
      : existingUrl;

  const isImage =
    useMemo(() => {
      if (hasFile) {
        return Boolean(
          file?.type?.startsWith(
            "image/"
          )
        );
      }

      if (!hasExisting) {
        return false;
      }

      /*
       * URL extension is only a fallback.
       * Many storage/CDN URLs do not end
       * with a normal image extension.
       */
      return /\.(jpg|jpeg|png|webp|gif|bmp|svg)(?:$|\?|#)/i.test(
        existingUrl
      );
    }, [
      file,
      hasFile,
      hasExisting,
      existingUrl,
    ]);

  /* ==========================================
      Select File
  ========================================== */

  function handleChange(event) {
    const selected =
      event.target.files?.[0];

    if (!selected) {
      return;
    }

    onChange?.(selected);

    /*
     * Allows selecting the same file again
     * after removing it.
     */
    event.target.value = "";
  }

  /* ==========================================
      Remove File
  ========================================== */

  function removeFile(event) {
    event.preventDefault();
    event.stopPropagation();

    if (hasFile) {
      onChange?.(null);

      return;
    }

    if (
      hasExisting &&
      onRemoveExisting
    ) {
      onRemoveExisting();

      return;
    }

    /*
     * If no explicit existing-file removal
     * handler is supplied, do not pretend
     * the existing server file has been
     * removed.
     */
  }

  /* ==========================================
      View Existing File
  ========================================== */

  function viewExisting(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!existingUrl) {
      return;
    }

    window.open(
      existingUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div
      className={`flex h-full flex-col ${className}`}
    >
      {label && (
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {label}

          {required && (
            <span className="ml-1 text-red-500">
              *
            </span>
          )}
        </label>
      )}

      <div
        className="
          relative
          flex
          flex-1
          flex-col
          overflow-hidden
          rounded-2xl
          border-2
          border-dashed
          border-slate-300
          bg-slate-50
          transition
          hover:border-blue-400
        "
      >
        {/* =================================
            Empty State
        ================================== */}

        {!hasAnyFile && (
          <label
            className="
              flex
              min-h-[180px]
              flex-1
              cursor-pointer
              flex-col
              items-center
              justify-center
              p-5
              text-center
              transition
              hover:bg-blue-50
            "
          >
            <input
              hidden
              type="file"
              accept={accept}
              onChange={
                handleChange
              }
            />

            <UploadCloud
              size={42}
              className="text-blue-600"
            />

            <h4 className="mt-4 font-semibold text-slate-800">
              Click to Upload
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Browse to select a file
            </p>

            {helperText && (
              <p className="mt-3 text-xs text-slate-400">
                {helperText}
              </p>
            )}
          </label>
        )}

        {/* =================================
            Existing / Selected File
        ================================== */}

        {hasAnyFile && (
          <div className="flex flex-1 flex-col p-4">
            {/* Preview */}

            {preview &&
            isImage &&
            imageSource ? (
              <div className="relative overflow-hidden rounded-xl bg-white">
                <img
                  src={imageSource}
                  alt={
                    existingName ||
                    file?.name ||
                    "File preview"
                  }
                  className="h-48 w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="
                  flex
                  min-h-[120px]
                  items-center
                  gap-4
                  rounded-xl
                  bg-white
                  p-4
                "
              >
                {isImage ? (
                  <ImageIcon
                    size={38}
                    className="shrink-0 text-blue-600"
                  />
                ) : (
                  <FileText
                    size={38}
                    className="shrink-0 text-blue-600"
                  />
                )}

                <div className="min-w-0">
                  <h4 className="truncate font-semibold text-slate-800">
                    {hasFile
                      ? file.name
                      : existingName ||
                        "Uploaded File"}
                  </h4>

                  <p className="mt-1 text-sm text-slate-500">
                    {hasFile
                      ? `${(
                          file.size /
                          1024 /
                          1024
                        ).toFixed(
                          2
                        )} MB`
                      : "Already uploaded"}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}

            <div
              className="
                mt-3
                flex
                flex-wrap
                items-center
                gap-2
              "
            >
              {hasExisting &&
                !hasFile && (
                  <button
                    type="button"
                    onClick={
                      viewExisting
                    }
                    className="
                      inline-flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-slate-600
                      transition
                      hover:border-blue-200
                      hover:bg-blue-50
                      hover:text-blue-700
                    "
                  >
                    <ExternalLink
                      size={14}
                    />

                    View
                  </button>
                )}

              <label
                className="
                  inline-flex
                  cursor-pointer
                  items-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-3
                  py-2
                  text-xs
                  font-semibold
                  text-white
                  transition
                  hover:bg-blue-700
                "
              >
                <input
                  hidden
                  type="file"
                  accept={
                    accept
                  }
                  onChange={
                    handleChange
                  }
                />

                <Replace
                  size={14}
                />

                {hasFile
                  ? "Choose another"
                  : "Replace"}
              </label>

              {(hasFile ||
                (hasExisting &&
                  onRemoveExisting)) && (
                <button
                  type="button"
                  onClick={
                    removeFile
                  }
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    border-red-100
                    bg-red-50
                    px-3
                    py-2
                    text-xs
                    font-semibold
                    text-red-600
                    transition
                    hover:bg-red-100
                  "
                >
                  <X
                    size={14}
                  />

                  Remove
                </button>
              )}
            </div>

            {helperText && (
              <p className="mt-3 text-xs text-slate-400">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}