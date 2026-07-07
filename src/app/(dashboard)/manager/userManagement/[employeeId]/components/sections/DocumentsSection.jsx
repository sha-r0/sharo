"use client";

import {
    FileText,
    Image as ImageIcon,
    Download,
} from "lucide-react";

import InfoCard from "../InfoCard";

export default function DocumentsSection({ employee }) {

    return (

        <InfoCard title="Documents">

            <div className="grid md:grid-cols-3 gap-6">

                {/* Photo */}

                <a

                    href={employee.photoUrl}

                    target="_blank"

                    className="border rounded-2xl overflow-hidden hover:shadow-lg transition"

                >

                    <img

                        src={employee.photoUrl}

                        className="h-52 w-full object-cover"

                    />

                    <div className="p-4 flex justify-between">

                        <span>Profile Photo</span>

                        <ImageIcon size={18} />

                    </div>

                </a>

                {/* Resume */}

                <a

                    href={employee.resumeUrl}

                    target="_blank"

                    className="border rounded-2xl p-8 hover:shadow-lg transition"

                >

                    <FileText
                        size={42}
                        className="text-blue-600"
                    />

                    <h3 className="mt-4 font-semibold">

                        Resume

                    </h3>

                    <Download className="mt-5" />

                </a>

                {/* Government ID */}

                <a

                    href={employee.governmentId?.fileUrl}

                    target="_blank"

                    className="border rounded-2xl p-8 hover:shadow-lg transition"

                >

                    <FileText
                        size={42}
                        className="text-green-600"
                    />

                    <h3 className="mt-4 font-semibold">

                        {employee.governmentId?.type}

                    </h3>

                    <p className="text-sm text-slate-500">

                        {employee.governmentId?.number}

                    </p>

                    <Download className="mt-5" />

                </a>

            </div>

        </InfoCard>

    );

}