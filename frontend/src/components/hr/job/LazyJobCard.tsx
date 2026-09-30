/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { Briefcase, Clock, MapPin, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "../../common/StatusBadge";
import { motion } from "framer-motion";

interface LazyJobCardProps {
  job: any;
  toCategory: any[];
  filteredApplicants: any[];
  onEdit: (id: number) => void;
  onDelete: (id: string) => void;
  onViewApplicants: (job: any) => void;
  menuOpen: string | null;
  setMenuOpen: (value: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
}

export const LazyJobCard = ({
  job,
  toCategory,
  filteredApplicants,
  onEdit,
  onDelete,
  onViewApplicants,
  menuOpen,
  setMenuOpen,
  dropdownRef,
}: LazyJobCardProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "100px", // Start loading 100px before the card is visible
        threshold: 0.1,
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && !isLoaded) {
      // Small delay to prevent too many simultaneous loads
      const timer = setTimeout(() => {
        setIsLoaded(true);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isVisible, isLoaded]);

  if (!isLoaded) {
    return (
      <div
        ref={cardRef}
        className="card-dashboard p-6 relative min-h-[300px] animate-pulse"
      >
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 rounded-lg w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded-lg w-1/2"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded-lg"></div>
            <div className="h-4 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      key={job._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card-dashboard p-6 relative hover:shadow-md transition-all duration-200 overflow-hidden"
      style={{
        backgroundImage: job.image
          ? `
          linear-gradient(
            50deg,
            white 0%,
            white 25%,
            rgba(255,255,255,0.95) 70%,
            rgba(255,255,255,0.7) 90%,
            transparent 100%
          ),
          url(${job.image})
        `
          : undefined,
        backgroundSize: job.image ? "cover" : undefined,
        backgroundPosition: job.image ? "center" : undefined,
        backgroundRepeat: job.image ? "no-repeat" : undefined,
      }}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 mb-1 truncate">
              {job.title}
            </h3>
            <p className="text-sm text-slate-500">
              {toCategory.find((c: any) => c._id === job.category)?.name ||
                "Unknown Category"}
            </p>
          </div>
          <StatusBadge
            status={job.jobStatus || "unknown"}
            variant={job.jobStatus === "active" ? "success" : "neutral"}
          />
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Briefcase className="w-4 h-4 flex-shrink-0" />
            <span className="capitalize">{job.employmentType}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-500">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>
              Posted {format(new Date(job.postedAt), "MMM dd, yyyy")}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-blue-600 font-medium">
              {
                filteredApplicants?.filter((applicant: any) =>
                  applicant.quizAttempts?.some(
                    (quiz: any) => quiz.jobId === String(job._id)
                  )
                ).length || 0
              }{" "}
              applicants
            </span>
            <span className="text-slate-500">0 views</span>
          </div>

          <div className="relative flex items-center">
            {/* Desktop view */}
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={() => onEdit(job._id)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => onViewApplicants(job)}
                className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Applicants
              </button>
              <button
                onClick={() => onDelete(String(job._id))}
                className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Delete
              </button>
            </div>

            {/* Mobile view */}
            <div ref={dropdownRef} className="md:hidden relative">
              <button
                onClick={() =>
                  setMenuOpen(menuOpen === job._id ? null : job._id)
                }
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>

              {/* Dropdown */}
              {menuOpen === job._id && (
                <div className="absolute right-0 bottom-full mb-2 w-44 bg-white border border-slate-200/80 rounded-lg shadow-lg z-50">
                  <button
                    onClick={() => {
                      onEdit(job._id);
                      setMenuOpen(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors rounded-t-lg"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onViewApplicants(job);
                      setMenuOpen(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    View Applicants
                  </button>
                  <button
                    onClick={() => {
                      onDelete(String(job._id));
                      setMenuOpen(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-lg"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

