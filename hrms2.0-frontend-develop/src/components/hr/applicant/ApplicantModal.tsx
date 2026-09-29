import React from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import {
  X,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  Award,
  Users,
  FileText,
  Hammer,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Applicant,
  Contacts,
  Education,
  Experience,
  Requirement,
} from "../../../types/hr/applicant/applicationInfoTypes";
import { formatDate } from "../../../utils/global/dateFormatter";

interface ApplicantModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicant: Applicant;
  education: Education[];
  experience: Experience[];
  reference: Contacts[];
  skills: string[];
  requirements: Requirement[];
}

const backdropVariants = {
  visible: { opacity: 1 },
  hidden: { opacity: 0 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8, y: 50 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 500,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 50,
    transition: { duration: 0.2 },
  },
};

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const getStatusColor = (status: string) => {
  console.log(status);
  switch (status.toLowerCase()) {
    case "unreviewed":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "rejected":
      return "bg-red-100 text-red-800 border-red-200";
    case "scheduled":
      return "bg-green-100 text-green-800 border-green-200";
    case "accepted":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const ApplicantModal: React.FC<ApplicantModalProps> = ({
  isOpen,
  onClose,
  applicant,
  education,
  experience,
  reference,
  skills,
  requirements,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between p-6 border-b border-gray-200 shadow-sm">
              <div>
                <p className="text-sm text-gray-600 mb-1">Applicant profile</p>
                <h2 className="text-2xl font-bold text-gray-900">
                  Applicant Information
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <motion.div
                className="p-8 space-y-8"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-6">
                    <div className="flex items-start gap-5 flex-1">
                      <img
                        src={applicant.profileImage}
                        alt="Profile"
                        className="w-24 h-24 rounded-lg border border-gray-300 object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="text-2xl font-bold text-gray-900 mb-4">
                          {[
                            applicant.firstName,
                            applicant.middleName,
                            applicant.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </h4>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-3">
                            <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">
                              {applicant.email}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-gray-700 text-sm">
                              {applicant.phoneNumber}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end sm:items-start gap-3">
                      <span
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(
                          applicant.status
                        )}`}
                      >
                        {applicant.status}
                      </span>
                    </div>
                  </div>
                </motion.section>
                
                {/* Quiz Results Section */}
                {applicant.quizAttempts && applicant.quizAttempts.length > 0 && (
                  <motion.section
                    variants={itemVariants}
                    className="bg-white rounded-lg border border-gray-200 p-6"
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Award className="w-5 h-5 mr-2 text-blue-600" />
                      Quiz Results
                    </h3>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                      {applicant.quizAttempts.map((attempt: any, index: number) => (
                        <div
                          key={index}
                          className={`${
                            index > 0 ? "mt-6 pt-6 border-t border-blue-200" : ""
                          }`}
                        >
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600 mb-1 block">
                                Job Title
                              </label>
                              <p className="text-gray-900 font-semibold">
                                {attempt.jobTitle || applicant.jobId?.title || "N/A"}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600 mb-1 block">
                                Category
                              </label>
                              <p className="text-gray-900 font-semibold">
                                {attempt.category || "N/A"}
                              </p>
                            </div>
                            {attempt.timeConsumed && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Time Consumed
                                </label>
                                <p className="text-gray-900 font-semibold">
                                  {attempt.timeConsumed}
                                </p>
                              </div>
                            )}
                            {attempt.startedAt && (
                              <div>
                                <label className="text-sm font-medium text-gray-600 mb-1 block">
                                  Date Taken
                                </label>
                                <p className="text-gray-900 font-semibold text-sm">
                                  {formatDate(String(attempt.startedAt))}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="grid md:grid-cols-3 gap-4 mt-4">
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">
                                Score
                              </label>
                              <p className="text-2xl font-bold text-blue-600">
                                {attempt.score ?? applicant.score ?? 0}
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">
                                Percentage
                              </label>
                              <p className="text-2xl font-bold text-blue-600">
                                {attempt.percentage ?? applicant.percentage ?? 0}%
                              </p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                              <label className="text-xs font-medium text-gray-600 mb-1 block">
                                Status
                              </label>
                              <div className="flex items-center gap-2 mt-1">
                                {attempt.status === "Passed" ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-red-600" />
                                )}
                                <p
                                  className={`text-lg font-bold ${
                                    attempt.status === "Passed"
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {attempt.status || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.section>
                )}
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-600" />
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Birthday
                      </label>
                      <p className="text-gray-900 font-medium">
                        {formatDate(String(applicant.birthday))}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Gender
                      </label>
                      <p className="text-gray-900 font-medium">
                        {applicant.gender}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Age
                      </label>
                      <p className="text-gray-900 font-medium">
                        {applicant.age} years old
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Citizenship
                      </label>
                      <p className="text-gray-900 font-medium">
                        {applicant.citizenship}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">
                        Place of Birth
                      </label>
                      <p className="text-gray-900 font-medium">
                        {applicant.placeOfBirth}
                      </p>
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="text-sm font-medium text-gray-500 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Address
                      </label>
                      <p className="text-gray-900 font-medium">
                        {applicant.address}
                      </p>
                    </div>
                  </div>
                </motion.section>
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <GraduationCap className="w-5 h-5 mr-2 text-purple-600" />
                    Education
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-5">
                    <div className="grid md:grid-cols-2 gap-6">
                      {education.map((edu, index) => (
                        <div key={index}>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Level
                            </label>
                            <p className="text-gray-900 font-medium">
                              {edu.level}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Duration
                            </label>
                            <p className="text-gray-900 font-medium">
                              {edu.fromYear} - {edu.toYear}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">
                              School Name
                            </label>
                            <p className="text-gray-900 font-medium">
                              {edu.schoolName}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">
                              Degree
                            </label>
                            <p className="text-gray-900 font-medium">
                              {edu.degree}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Hammer className="w-5 h-5 mr-2 text-blue-600" />
                    Experience
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-5">
                    <div className="grid md:grid-cols-2 gap-6">
                      {experience.map((exp, index) => (
                        <div key={index}>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Company Name
                            </label>
                            <p className="text-gray-900 font-medium">
                              {exp.companyName}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Location
                            </label>
                            <p className="text-gray-900 font-medium">
                              {exp.companyLocation}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Position
                            </label>
                            <p className="text-gray-900 font-medium">
                              {exp.position}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Duration
                            </label>
                            <p className="text-gray-900 font-medium">
                              {exp.fromYear} - {exp.toYear}
                            </p>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-sm font-medium text-gray-500">
                              Reason for Leaving
                            </label>
                            <p className="text-gray-900 font-medium">
                              {exp.reasonForLeaving}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-orange-600" />
                    Specific Skills
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {skills.map((skill, index) => (
                      <motion.span
                        key={index}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="px-4 py-2 bg-orange-50 text-orange-800 rounded-lg text-sm font-medium border border-orange-200 hover:shadow-sm transition-shadow duration-200"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.section>
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-teal-600" />
                    References
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-5">
                    <div className="grid md:grid-cols-3 gap-4">
                      {reference.map((ref, index) => (
                        <div key={index}>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Name
                            </label>
                            <p className="text-gray-900 font-medium">
                              {ref.name}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              RelationShip
                            </label>
                            <p className="text-gray-900 font-medium">
                              {ref.relationship}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">
                              Contact
                            </label>
                            <p className="text-gray-900 font-medium">
                              {ref.contactNumber}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.section>
                <motion.section
                  variants={itemVariants}
                  className="bg-white rounded-lg border border-gray-200 p-6"
                >
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-red-600" />
                    Submitted Requirements
                  </h3>
                  <div className="space-y-3">
                    {requirements.length === 0 ? (
                      <div className="w-full flex justify-center">
                        <p>No requirements submitted.</p>
                      </div>
                    ) : (
                      requirements.map((req) => (
                        <div
                          key={req._id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <span className="font-medium text-gray-900">
                              <strong>{req.requirementName}</strong>
                            </span>
                          </div>
                          <a
                            href={req.reqFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm"
                          >
                            View File
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </motion.section>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ApplicantModal;
