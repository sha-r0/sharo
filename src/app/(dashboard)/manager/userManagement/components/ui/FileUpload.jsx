"use client";

import { UploadCloud, FileText, X } from "lucide-react";

export default function FileUpload({

    label,

    file = null,

    existingUrl = "",

    existingName = "",

    onChange,

    accept = "*",

    helperText = "",

    required = false,

    preview = false,

    className = "",

}) {

    function handleChange(e) {

        const selected = e.target.files?.[0];

        if (!selected) return;

        onChange?.(selected);

    }

    function removeFile(e) {

        e.preventDefault();

        onChange?.(null);

    }

    const hasFile = !!file;

    const hasExisting = !!existingUrl;

    const imageSource = hasFile
        ? URL.createObjectURL(file)
        : existingUrl;

    const isImage = hasFile
        ? file.type?.startsWith("image")
        : /\.(jpg|jpeg|png|webp|gif)/i.test(existingUrl);

    return (

        <div className={`flex flex-col h-full ${className}`}>

            {label && (

                <label className="block mb-2 text-sm font-semibold text-slate-700">

                    {label}

                    {required && (

                        <span className="text-red-500 ml-1">*</span>

                    )}

                </label>

            )}

            <label
                className="
                    relative
                    p-5
                    flex-1
                    flex
                    flex-col
                    items-center
                    justify-center
                    border-2
                    border-dashed
                    border-slate-300
                    rounded-2xl
                    bg-slate-50
                    hover:border-blue-500
                    hover:bg-blue-50
                    transition
                    cursor-pointer
                    overflow-hidden
                "
            >

                <input

                    hidden

                    type="file"

                    accept={accept}

                    onChange={handleChange}

                />

                {!hasFile && !hasExisting && (

                    <>

                        <UploadCloud

                            size={42}

                            className="text-blue-600"

                        />

                        <h4 className="mt-4 font-semibold">

                            Click to Upload

                        </h4>

                        <p className="text-sm text-slate-500 mt-2">

                            Drag & Drop or Browse

                        </p>

                        {helperText && (

                            <p className="text-xs text-slate-400 mt-3">

                                {helperText}

                            </p>

                        )}

                    </>

                )}

                {(hasFile || hasExisting) && (

                    <div className="w-full p-6">

                        {preview && isImage ? (

                            <img

                                src={imageSource}

                                alt="Preview"

                                className="w-full h-48 rounded-xl object-cover"

                            />

                        ) : (

                            <div className="flex items-center gap-4">

                                <FileText

                                    size={42}

                                    className="text-blue-600"

                                />

                                <div>

                                    <h4 className="font-semibold">

                                        {hasFile

                                            ? file.name

                                            : existingName || "Uploaded File"}

                                    </h4>

                                    <p className="text-sm text-slate-500">

                                        {hasFile

                                            ? `${(

                                                file.size /

                                                1024 /

                                                1024

                                            ).toFixed(2)} MB`

                                            : "Already uploaded"}

                                    </p>

                                </div>

                            </div>

                        )}

                        <button

                            type="button"

                            onClick={removeFile}

                            className="
                                absolute
                                top-3
                                right-3
                                w-9
                                h-9
                                rounded-full
                                bg-white
                                shadow
                                flex
                                items-center
                                justify-center
                                hover:bg-red-50
                            "

                        >

                            <X

                                size={18}

                                className="text-red-500"

                            />

                        </button>

                    </div>

                )}

            </label>

        </div>

    );

}