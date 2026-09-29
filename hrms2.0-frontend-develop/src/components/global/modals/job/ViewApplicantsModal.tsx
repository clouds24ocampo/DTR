/* eslint-disable @typescript-eslint/no-explicit-any */
import { X, Mail, Phone, User, Award, Calendar } from "lucide-react";
import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  backdropVariants,
  modalVariants,
} from "../../../../utils/global/motionVariants";
import { format } from "date-fns";
import Avatar from "avatox";
import { StatusBadge } from "../../../common/StatusBadge";

interface ViewApplicantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicants: any[];
  jobTitle: string;
}

const ViewApplicantsModal = ({
  isOpen,
  onClose,
  applicants,
  jobTitle,
}: ViewApplicantsModalProps) => {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const getQuizScore = (applicant: any) => {
    if (!applicant.quizAttempts || applicant.quizAttempts.length === 0) {
      return null;
    }
    // Get the most recent quiz attempt
    const latestAttempt = applicant.quizAttempts[applicant.quizAttempts.length - 1];
    return {
      score: latestAttempt.score || 0,
      percentage: latestAttempt.percentage || 0,
      status: latestAttempt.status || "N/A",
    };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 !mt-0"
        onClick={handleOverlayClick}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="bg-white text-on-light rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200 shadow-sm">
            <div>
              <p className="text-sm text-gray-600 mb-1">Job applicants</p>
              <h2 className="text-2xl font-bold text-gray-900">{jobTitle}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {applicants.length} {applicants.length === 1 ? "applicant" : "applicants"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {applicants.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No applicants yet
                </h3>
                <p className="text-gray-500 text-sm">
                  This job posting hasn't received any applications yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applicants.map((applicant) => {
                  const firstName = applicant.firstName || "";
                  const lastName = applicant.lastName || "";
                  const middleName = applicant.middleName || "";
                  const fullName = [firstName, middleName, lastName]
                    .filter(Boolean)
                    .join(" ");
                  const initials = (
                    (firstName[0] || "") + (lastName[0] || "")
                  ).toUpperCase();
                  const quizData = getQuizScore(applicant);

                  return (
                    <motion.div
                      key={applicant._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Avatar and Basic Info */}
                        <div className="flex items-start gap-4 flex-1">
                          <div className="relative">
                            {applicant.profileImage ? (
                              <Avatar
                                src={applicant.profileImage}
                                name={fullName}
                                size="lg"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-lg">
                                  {initials}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {fullName || "N/A"}
                            </h3>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{applicant.email || "N/A"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone className="w-4 h-4 flex-shrink-0" />
                                <span>{applicant.phoneNumber || "N/A"}</span>
                              </div>
                              {applicant.submittedAt && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  <span>
                                    Applied{" "}
                                    {format(
                                      new Date(applicant.submittedAt),
                                      "MMM dd, yyyy"
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status and Quiz Score */}
                        <div className="flex flex-col items-end sm:items-start gap-3">
                          <StatusBadge
                            status={applicant.status || "Unreviewed"}
                            variant={
                              applicant.status === "Accepted"
                                ? "success"
                                : applicant.status === "Rejected"
                                ? "error"
                                : applicant.status === "Scheduled"
                                ? "info"
                                : "neutral"
                            }
                          />

                          {quizData && (
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                              <Award className="w-4 h-4 text-blue-600" />
                              <div className="text-sm">
                                <div className="font-semibold text-blue-900">
                                  {quizData.percentage}%
                                </div>
                                <div className="text-xs text-blue-700">
                                  {quizData.status}
                                </div>
                              </div>
                            </div>
                          )}

                          {!quizData && (
                            <div className="text-xs text-gray-500 italic">
                              No quiz attempt
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 z-10 bg-white flex items-center justify-end p-6 border-t border-gray-200 shadow-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ViewApplicantsModal;

