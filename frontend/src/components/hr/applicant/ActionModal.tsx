/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import { Modal } from "./Modal";
import {
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Plus,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  acceptApplicant,
  pendingApplicant,
  rejectApplicant,
  scheduleApplicant,
} from "../../../api/hr/applicant.api";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
} from "@react-pdf/renderer";
import useAuthStore from "../../../stores/auth/auth.store";
import { useFetchData } from "../../../hooks/useFetchData";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: string;
  candidate: {
    _id: string;
    firstName: string;
    middleName: string;
    address: string;
    lastName: string;
    email?: string;
    position?: string;
    uploadedFiles?: Array<{ reqFile?: string }>;
  } | null;
  onConfirm?: () => void;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    padding: 72,
  },
  section: {
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  address: {
    fontSize: 10,
    textAlign: "center",
  },
  phone: {
    fontSize: 9,
    textAlign: "center",
  },
  documentIdentifier: {
    fontSize: 10,
    textAlign: "center",
    marginVertical: 5,
  },
  content: {
    marginTop: 15,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    textAlign: "left",
  },
  titleContainer2: {
    flexDirection: "column",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 12,
    textAlign: "left",
  },

  logo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  toCenterAll: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  horizontalLine: {
    borderBottom: "1pt solid black",
    marginVertical: 10,
  },
  companyDetails: {
    fontSize: 12,
    textAlign: "left",
    fontWeight: "bold",
    marginTop: 20,
  },
  bodyContent: {
    fontSize: 12,
    textAlign: "left",
    marginTop: 10,
  },
  margin: {
    marginTop: 20,
  },
  boldText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  actionType,
  candidate,
  onConfirm,
}) => {
  if (!candidate) return null;
  const [type, setType] = useState("Video-Call");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });

  const [location, setLocation] = useState("");
  const [requirementsToBring, setRequirementsToBring] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [generate, setGenerate] = useState(true);
  const [reasonForRejecting, setReasonForRejecting] = useState("");
  const [docRef] = useState(() => 
    `EMP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  );

  const { refetchAll } = useFetchData();

  const { account } = useAuthStore();

  const addRequirement = () => {
    setRequirementsToBring([...requirementsToBring, ""]);
  };

  const updateRequirement = (index: number, value: string) => {
    const updatedRequirements = [...requirementsToBring];
    updatedRequirements[index] = value;
    setRequirementsToBring(updatedRequirements);
  };

  const removeRequirement = (index: number) => {
    const updatedRequirements = requirementsToBring.filter(
      (_, i) => i !== index
    );
    setRequirementsToBring(updatedRequirements);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("application/pdf")) {
      alert("Only PDF files are allowed!");
      return;
    }
    setUploadedFile(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0]);
    }
  };

  const formatTo12Hour = (time24: string): string => {
    const [hourStr, minuteStr] = time24.split(":");
    let hours = parseInt(hourStr, 10);
    const minutes = minuteStr;
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours === 0 ? 12 : hours;

    return `${hours}:${minutes} ${ampm}`;
  };

  const MyDocument = () => (
    <Document>
      <Page style={styles.page}>
        <View style={styles.section}>
          <View style={styles.titleContainer}>
            <Image
              style={styles.logo}
              src={import.meta.env.VITE_COMPANY_LETTER_LOGO}
            />
            <View style={styles.titleContainer2}>
              <Text style={styles.title}>
                QUANTUM CLOUD CORPORATION
              </Text>
              <Text style={styles.address}>
                Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo Subd., Bayan Luma IV, Imus, Cavite
              </Text>
              <Text style={styles.phone}>+63 917 123 4567</Text>
            </View>
            <Image
              style={styles.logo}
              src={import.meta.env.VITE_COMPANY_LETTER_LOGO}
            />
          </View>
          <View style={styles.horizontalLine} />
          <View style={styles.documentIdentifier}>
            <Text>{docRef}</Text>
          </View>
          <View style={styles.horizontalLine} />
          <View style={styles.companyDetails}>
            <Text>QUANTUM CLOUD CORPORATION</Text>
            <Text>
              Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo
              Subd.,
            </Text>
            <Text>Bayan Luma IV, Imus Cavite</Text>
          </View>
          <View style={styles.bodyContent}>
            <Text>{date}</Text>
          </View>
          <View style={styles.bodyContent}>
            <Text style={styles.boldText}>
              {candidate.firstName} {candidate.lastName}
            </Text>
            <Text>{candidate.address}</Text>
          </View>
          <View style={styles.margin}>
            <Text style={styles.bodyContent}>
              Dear <Text style={styles.boldText}>{candidate.firstName}</Text>,
            </Text>
          </View>
          <View style={styles.bodyContent}>
            <Text>
              With great pleasure, I would like to extend the following
              employment offer.
            </Text>
          </View>
          <View style={styles.bodyContent}>
            <Text>
              Position:{" "}
              <Text style={styles.boldText}>{candidate.position}</Text>
            </Text>
            <Text>
              Start date: No later than{" "}
              <Text style={styles.boldText}>{date}</Text>
            </Text>
            <Text>
              Start time:{" "}
              <Text style={styles.boldText}>{formatTo12Hour(time)}</Text>
            </Text>
          </View>
          <View style={styles.bodyContent}>
            <Text>
              This employment offer is contingent upon the successful completion
              of all pre-employment requirements, which may include, but are not
              limited to: background investigation, medical examination
              (inclusive of drug testing), reference checks, and submission of
              mandatory government documents such as NBI Clearance, Social
              Security System (SSS) number, PhilHealth number, Pag-IBIG Fund
              number, and Bureau of Internal Revenue (BIR) Tax Identification
              Number (TIN).
            </Text>
          </View>
          <View style={styles.bodyContent}>
            <Text>
              Please note that this offer does not constitute a contract of
              employment. Employment with the Company shall be governed by
              applicable provisions of the Philippine Labor Code. Either party
              may terminate the employment relationship at any time, subject to
              compliance with the legal requirements on notice and due process.
            </Text>
          </View>
          <View style={styles.bodyContent}>
            <Text style={styles.margin}>Sincerely,</Text>
          </View>
          <View style={styles.bodyContent}>
            <Text style={styles.boldText}>
              {account?.firstName} {account?.lastName}
            </Text>
            <Text style={styles.boldText}>{account?.position}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );

  const handleGeneratePDF = async () => {
    setLoading(true);

    const blob = await pdf(<MyDocument />).toBlob();
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = candidate.firstName + "-" + candidate.position + ".pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setLoading(false);
    setGenerate(false);
  };

  const handleSubmitSchedule = async (id: string) => {
    if (!type || !date || !location || !time) {
      toast.error("All fields are required.");
      return;
    }

    setLoading(true);

    try {
      const success = await scheduleApplicant(
        id,
        type,
        date,
        time,
        location,
        requirementsToBring
      );

      if (success) {
        onClose();
        onConfirm?.();
        setLoading(false);
        refetchAll();
      } else {
        toast.error("Unable to schedule interview.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast.error("An error occurred while scheduling.");
      setLoading(false);
    }
  };

  const handleSubmitPending = async (id: string) => {
    setLoading(true);

    try {
      const success = await pendingApplicant(id);

      if (success) {
        setLoading(false);
        onClose();
        onConfirm?.();
        refetchAll();
      } else {
        toast.error("Unable to pend");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast.error("An error occurred while pending.");
      setLoading(false);
    }
  };

  const handleSubmitAccept = async (id: string) => {
    setLoading(true);

    if (!uploadedFile) {
      setLoading(false);
      toast.error("File required");
      return;
    }

    try {
      const success = await acceptApplicant(id, uploadedFile);

      if (success) {
        setLoading(false);
        onClose();
        onConfirm?.();
        refetchAll();
      } else {
        toast.error("Unable to pend");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast.error("An error occurred while pending.");
      setLoading(false);
    }
  };

  const handleSubmitReject = async (id: string) => {
    setLoading(true);

    try {
      const success = await rejectApplicant(id, reasonForRejecting);

      if (success) {
        setLoading(false);
        onClose();
        onConfirm?.();
        refetchAll();
      } else {
        toast.error("Unable to pend");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast.error("An error occurred while pending.");
      setLoading(false);
    }
  };

  const getModalContent = () => {
    switch (actionType) {
      case "hire": {
        const hireIcon = (
          <UserCheck className="w-12 h-12 text-green-500 mx-auto mb-4" />
        );
        return {
          title: "Hire Candidate",
          icon: hireIcon,
          content: (
            <div className="text-center">
              {hireIcon}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hire {candidate.firstName} {candidate.lastName}?
              </h3>

              {generate ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-start">
                      Date
                    </label>
                    <input
                      type="date"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-start">
                      Time
                    </label>
                    <input
                      type="time"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                      value={time || "00:00"}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>

                  {/* PDF Preview */}
                  <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                      <h4 className="text-sm font-semibold text-gray-700">Document Preview</h4>
                    </div>
                    <div 
                      className="bg-white" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif',
                        padding: '96px', // 72pt = 96px (72 * 1.33)
                        fontSize: '12px',
                        lineHeight: '1.5'
                      }}
                    >
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <img
                            src={import.meta.env.VITE_COMPANY_LETTER_LOGO}
                            alt="Logo"
                            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                          />
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>
                              QUANTUM CLOUD CORPORATION
                            </div>
                            <div style={{ fontSize: '10px', marginBottom: '1px' }}>
                              Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo Subd., Bayan Luma IV, Imus, Cavite
                            </div>
                            <div style={{ fontSize: '9px' }}>+63 917 123 4567</div>
                          </div>
                          <img
                            src={import.meta.env.VITE_COMPANY_LETTER_LOGO}
                            alt="Logo"
                            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                          />
                        </div>
                      </div>
                      <div style={{ borderBottom: '1pt solid black', marginTop: '10px', marginBottom: '10px' }}></div>
                      <div style={{ fontSize: '10px', textAlign: 'center', marginTop: '5px', marginBottom: '5px' }}>
                        {docRef}
                      </div>
                      <div style={{ borderBottom: '1pt solid black', marginTop: '10px', marginBottom: '10px' }}></div>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'left', marginTop: '20px' }}>
                        <div>QUANTUM CLOUD CORPORATION</div>
                        <div>Unit 7, Block 1 Lot 23, Home Lane Realty Building, Villa Amparo Subd.,</div>
                        <div>Bayan Luma IV, Imus Cavite</div>
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>{date}</div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {candidate.firstName} {candidate.lastName}
                        </div>
                        <div>{candidate.address}</div>
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '20px' }}>
                        Dear <span style={{ fontWeight: 'bold' }}>{candidate.firstName}</span>,
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        With great pleasure, I would like to extend the following employment offer.
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        <div>
                          Position: <span style={{ fontWeight: 'bold' }}>{candidate.position}</span>
                        </div>
                        <div>
                          Start date: No later than <span style={{ fontWeight: 'bold' }}>{date}</span>
                        </div>
                        <div>
                          Start time: <span style={{ fontWeight: 'bold' }}>{formatTo12Hour(time)}</span>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        This employment offer is contingent upon the successful completion of all pre-employment requirements, which may include, but are not limited to: background investigation, medical examination (inclusive of drug testing), reference checks, and submission of mandatory government documents such as NBI Clearance, Social Security System (SSS) number, PhilHealth number, Pag-IBIG Fund number, and Bureau of Internal Revenue (BIR) Tax Identification Number (TIN).
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        Please note that this offer does not constitute a contract of employment. Employment with the Company shall be governed by applicable provisions of the Philippine Labor Code. Either party may terminate the employment relationship at any time, subject to compliance with the legal requirements on notice and due process.
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '20px' }}>
                        Sincerely,
                      </div>
                      <div style={{ fontSize: '12px', textAlign: 'left', marginTop: '10px' }}>
                        <div style={{ fontWeight: 'bold' }}>
                          {account?.firstName} {account?.lastName}
                        </div>
                        <div style={{ fontWeight: 'bold' }}>{account?.position}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex justify-start px-5">
                  <input
                    type="file"
                    id="fileUpload"
                    name="fileUpload"
                    accept=".pdf"
                    multiple
                    onChange={handleFileChange}
                  />
                </div>
              )}

              <p className="text-gray-600 mb-6 flex gap-3 justify-end pt-4 border-t border-gray-200 mt-5">
                This action will mark the candidate as hired and send them a
                notification. This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-6">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                {generate ? (
                  <button
                    onClick={handleGeneratePDF}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          aria-hidden="true"
                          className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Generate PDF"
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleSubmitAccept(candidate._id);
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          aria-hidden="true"
                          className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Hire Candidate"
                    )}
                  </button>
                )}
              </div>
            </div>
          ),
        };
      }

      case "reject": {
        const rejectIcon = (
          <UserX className="w-12 h-12 text-red-500 mx-auto mb-4" />
        );
        return {
          title: "Reject Candidate",
          icon: rejectIcon,
          content: (
            <div className="text-center">
              {rejectIcon}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Reject {candidate.firstName} {candidate.lastName}?
              </h3>
              <p className="text-gray-600 mb-6">
                This action will mark the candidate as rejected. You can provide
                feedback before confirming the rejection.
              </p>
              <textarea
                placeholder="Optional feedback for the candidate..."
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 h-24 resize-none"
                rows={6}
                value={reasonForRejecting}
                onChange={(e) => setReasonForRejecting(e.target.value)}
              />
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSubmitReject(candidate._id);
                  }}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        aria-hidden="true"
                        className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"
                        />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Reject Candidate"
                  )}
                </button>
              </div>
            </div>
          ),
        };
      }

      case "interview": {
        const interviewIcon = (
          <Calendar className="w-12 h-12 text-purple-500 mx-auto mb-4" />
        );
        return {
          title: "Schedule Interview",
          icon: interviewIcon,
          content: (
            <div>
              {interviewIcon}
              <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Schedule Interview with {candidate.firstName}{" "}
                {candidate.lastName}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interview Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                  >
                    <option value={"video-call"}>Video Call</option>
                    <option value={"in-person"}>In-Person</option>
                    <option value={"phone-interview"}>Phone Interview</option>
                    <option value={"panel-interview"}>Panel Interview</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    value={time || "00:00"}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="Conference Room A, Zoom Link, etc."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    value={location}
                    onChange={(e) => {
                      const value = e.target.value;
                      const capitalized =
                        value.charAt(0).toUpperCase() + value.slice(1);
                      setLocation(capitalized);
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-600 mb-2">
                    Requirement
                  </label>
                  <div className="space-y-2">
                    {requirementsToBring.map((requirement, index) => (
                      <div key={index} className="relative">
                        <input
                          type="text"
                          value={requirement}
                          onChange={(e) =>
                            updateRequirement(index, e.target.value)
                          }
                          placeholder="Enter requirement..."
                          className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                        <button
                          onClick={() => removeRequirement(index)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors duration-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addRequirement}
                      className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors duration-200 bg-gray-50 hover:bg-blue-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add requirement
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 mt-6">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSubmitSchedule(candidate._id)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg
                          aria-hidden="true"
                          className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                          viewBox="0 0 100 101"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                            fill="currentColor"
                          />
                          <path
                            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                            fill="currentFill"
                          />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      "Schedule Interview"
                    )}
                  </button>
                </div>
              </div>
            </div>
          ),
        };
      }

      case "pending": {
        const pendingIcon = (
          <Clock className="w-12 h-12 text-orange-500 mx-auto mb-4" />
        );
        return {
          title: "Mark as Pending",
          icon: pendingIcon,
          content: (
            <div className="text-center">
              {pendingIcon}
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Mark {candidate.firstName} {candidate.lastName} as Pending?
              </h3>
              <p className="text-gray-600 mb-6">
                This will move the candidate to pending status for further
                review.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleSubmitPending(candidate._id);
                  }}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg
                        aria-hidden="true"
                        className="inline w-5 h-5 border-1 text-gray text-opacity-25 animate-spin fill-white me-2"
                        viewBox="0 0 100 101"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                          fill="currentColor"
                        />
                        <path
                          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                          fill="currentFill"
                        />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    "Mark as Pending"
                  )}
                </button>
              </div>
            </div>
          ),
        };
      }

      default:
        return {
          title: "Action",
          icon: null,
          content: <div>Unknown action</div>,
        };
    }
  };

  const modalContent = getModalContent();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalContent.title}
      size="md"
    >
      {modalContent.content}
    </Modal>
  );
};
