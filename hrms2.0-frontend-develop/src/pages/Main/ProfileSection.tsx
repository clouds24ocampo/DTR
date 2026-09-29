/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  FileText,
  Edit3,
  Save,
  X,
  Camera,
  ChevronDown,
  Building2,
  CreditCard,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Award,
} from "lucide-react";
import { ProfileData } from "../../types/global/profile.types";
import { AccountType } from "../../types/auth/auth.type";
import useAuthStore from "../../stores/auth/auth.store";
import Avatar from "avatox";
import { uploadFileInChunks } from "../../utils/global/chunkUploader";
import { updateUserProfile } from "../../api/workplace/user/user.api";
import toast from "react-hot-toast";
import { containerVariants, itemVariants } from "../../utils/global/pageMotion";
import ChangePasswordModal from "../../components/common/ChangePasswordModal";
import { checkGeoFence } from "../../utils/global/geofence";

// Helper function to check if avatar is a valid image URL
const isValidImageUrl = (url: string | undefined | null): boolean => {
  if (!url || typeof url !== "string" || url.trim() === "") return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:image/") ||
    url.startsWith("/")
  );
};

interface ProfileSectionProps {
  initialData?: ProfileData;
  onSave?: (data: ProfileData) => Promise<void>;
}

type EditableField = keyof ProfileData;

interface SectionConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  fields: {
    key: EditableField;
    label: string;
    icon: React.ReactNode;
    type?: string;
    multiline?: boolean;
    editable?: boolean;
    format?: (value: any) => string;
  }[];
}

export default function ProfileSection({
  initialData,
  onSave,
}: ProfileSectionProps) {
  const { account, setAccount } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["personal", "account", "work"])
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isInGeoFence, setIsInGeoFence] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snapshotRef = useRef<ProfileData | null>(null);

  // Initialize profile data from account
  const initialProfileData = useMemo<ProfileData>(() => {
    if (initialData) return initialData;
    return {
      firstName: account?.firstName || "",
      middleName: account?.middleName || "",
      lastName: account?.lastName || "",
      position: (Array.isArray(account?.position) ? account?.position[0] : account?.position) || "",
      idNumber: account?.idNumber || "",
      email: account?.email || "",
      phone: account?.phone || "",
      gender: account?.gender || "",
      dateOfBirth: account?.dateOfBirth || "",
      about: account?.about || "",
      profilePicture: account?.profilePicture || "",
      workInfo: account?.department || "",
      location: account?.location || "",
      salary: account?.salary || 0,
      salaryType: account?.salaryType || "",
      username: "",
      password: account?.password || "",
      archived: false,
    };
  }, [initialData, account]);

  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);

  // Update profileData when initialProfileData changes (when account updates)
  useEffect(() => {
    console.log("ProfileSection - account data:", account);
    console.log("ProfileSection - initialProfileData:", initialProfileData);
    if (!isEditing) {
      setProfileData(initialProfileData);
    }
  }, [initialProfileData, isEditing, account]);

  // Handle Geo-fence check
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const geoFenceStr = import.meta.env.VITE_GEO_FENCE_POLYGON || "";
          const isInside = checkGeoFence(latitude, longitude, geoFenceStr);
          setIsInGeoFence(isInside);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setIsInGeoFence(false);
        }
      );
    }
  }, []);

  // Reset to initial values when canceling
  const resetProfileData = () => {
    if (snapshotRef.current) {
      setProfileData(snapshotRef.current);
    } else {
      setProfileData(initialProfileData);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave(profileData);
      } else {
        const userId = account?._id;
        if (!userId) {
          toast.error("User ID not found. Please try again.");
          return;
        }

        // Prepare update payload - only include changed fields
        const updatePayload: any = {
          firstName: profileData.firstName || undefined,
          middleName: profileData.middleName || undefined,
          lastName: profileData.lastName || undefined,
          email: profileData.email || undefined,
          phone: profileData.phone || undefined,
          about: profileData.about || undefined,
          gender: profileData.gender || undefined,
          dateOfBirth: profileData.dateOfBirth || undefined,
        };

        // Include profile picture if it was changed
        if (snapshotRef.current && profileData.profilePicture !== snapshotRef.current.profilePicture) {
          updatePayload.profilePictureUrl = profileData.profilePicture;
        }

        const response = await updateUserProfile(userId as string, updatePayload);
        if (response?.employee) {
          setAccount(response.employee);
          toast.success("Profile updated successfully!");
        }
      }
      setIsEditing(false);
      snapshotRef.current = null;
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetProfileData();
    setIsEditing(false);
    snapshotRef.current = null;
  };

  const handleInputChange = (field: EditableField, value: string | number) => {
    if (field === 'roles' && typeof value === 'string') {
      const rolesArray = value.split(',').map(r => r.trim()).filter(Boolean);
      setProfileData((prev) => ({ ...prev, [field]: rolesArray }));
      return;
    }
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileImageUpload = async (file: File) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload a JPG or PNG image.");
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("File size too large. Please upload an image smaller than 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      // Upload the file and get the URL
      const imageUrl = await uploadFileInChunks(
        file,
        `hrms/admin/employees/${account?._id || "profile"}`
      );

      // Only update local state - don't save to backend yet
      // The image will be saved when user clicks "Save Changes"
      setProfileData((prev) => ({ ...prev, profilePicture: imageUrl }));
      toast.success("Profile picture uploaded. Click 'Save Changes' to apply.");
    } catch (error) {
      console.error("Error uploading profile image:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload profile picture. Please try again."
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProfileImageUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCopyId = (id: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setIsCopied(true);
    toast.success("ID copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Check if account data is available
  if (!account) {
    return (
      <motion.div
        className="w-full h-auto overflow-x-hidden"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="bg-white rounded-lg sm:rounded-lg shadow-xl overflow-hidden p-8 text-center">
          <p className="text-slate-600 text-lg">Loading profile data...</p>
        </div>
      </motion.div>
    );
  }

  const fullName = `${account?.firstName ?? ""} ${account?.lastName ?? ""}`.trim() || "User";
  // Use profileData.profilePicture when editing to show preview, otherwise use account.profilePicture
  const currentProfilePicture = isEditing
    ? profileData.profilePicture
    : account?.profilePicture;
  const hasValidImage = currentProfilePicture && isValidImageUrl(currentProfilePicture);
  const avatarSrc = hasValidImage ? currentProfilePicture : undefined;

  // Define sections configuration
  const sections: SectionConfig[] = [
    {
      id: "personal",
      title: "Personal Information",
      icon: <User size={20} />,
      fields: [
        {
          key: "firstName",
          label: "First Name",
          icon: <User size={18} />,
          type: "text",
          editable: true,
        },
        {
          key: "middleName",
          label: "Middle Name",
          icon: <User size={18} />,
          type: "text",
          editable: true,
        },
        {
          key: "lastName",
          label: "Last Name",
          icon: <User size={18} />,
          type: "text",
          editable: true,
        },
        {
          key: "phone",
          label: "Phone",
          icon: <Phone size={18} />,
          type: "tel",
          editable: true,
        },
        {
          key: "gender",
          label: "Gender",
          icon: <User size={18} />,
          type: "text",
          editable: true,
        },
        {
          key: "dateOfBirth",
          label: "Date of Birth",
          icon: <Calendar size={18} />,
          type: "date",
          editable: true,
          format: (value: any) => {
            if (!value) return "";
            const date = new Date(value);
            return date.toLocaleDateString("en-US", {
              month: "long",
              day: "2-digit",
              year: "numeric",
            });
          },
        },
        {
          key: "about",
          label: "About",
          icon: <FileText size={18} />,
          multiline: true,
          editable: true,
        },
      ],
    },
    {
      id: "account",
      title: "Login Credentials",
      icon: <Lock size={20} />,
      fields: [
        {
          key: "email",
          label: "Login Email",
          icon: <Mail size={18} />,
          type: "email",
          editable: true,
        },
        {
          key: "password",
          label: "Login Password",
          icon: <Lock size={18} />,
          type: "password",
          editable: false,
        },
      ],
    },
    {
      id: "work",
      title: "Work Information",
      icon: <Briefcase size={20} />,
      fields: [
        {
          key: "position",
          label: "Position",
          icon: <Briefcase size={18} />,
          editable: false,
        },
        {
          key: "idNumber",
          label: "ID Number",
          icon: <CreditCard size={18} />,
          editable: false,
        },
        {
          key: "workInfo",
          label: "Department",
          icon: <Building2 size={18} />,
          editable: false,
        },
        {
          key: "location",
          label: "Office Location",
          icon: <MapPin size={18} />,
          editable: false,
        },
        {
          key: "salary",
          label: "Salary",
          icon: <DollarSign size={18} />,
          type: "number",
          editable: false,
          format: (value) =>
            value
              ? `${Number(value).toLocaleString()} ${profileData.salaryType ? `(${profileData.salaryType})` : ""}`
              : "Not provided",
        },
        {
          key: "roles",
          label: "Assigned Roles (Comma separated)",
          icon: <Award size={18} />,
          editable: (Array.isArray(account?.position) ? account?.position[0] : account?.position) === "HR",
          type: "text",
        },
      ],
    },
  ];

  return (
    <motion.div
      className="w-full h-auto overflow-x-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="bg-white rounded-lg sm:rounded-lg shadow-xl overflow-hidden">
        {/* Header Section */}
        <div className="relative h-40 sm:h-56 bg-gradient-to-r from-gray-900 via-blue-900 to-blue-800">
          <div className="absolute inset-0 bg-black opacity-20"></div>
          <motion.div
            className="absolute top-4 right-4 flex gap-2"
            variants={itemVariants}
          >
            <AnimatePresence mode="wait">
              {!isEditing ? (
                <motion.button
                  key="edit"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => {
                    // Capture snapshot of current state when editing starts
                    snapshotRef.current = { ...profileData };
                    setIsEditing(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors shadow-lg text-sm sm:text-base min-h-[44px]"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Edit3 size={18} />
                  <span className="hidden sm:inline">Edit Profile</span>
                  <span className="sm:hidden">Edit</span>
                </motion.button>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex gap-2"
                >
                  <motion.button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition-colors shadow-lg text-sm sm:text-base min-h-[44px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={18} />
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 active:bg-slate-950 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
                    whileHover={{ scale: isSaving ? 1 : 1.05 }}
                    whileTap={{ scale: isSaving ? 1 : 0.95 }}
                  >
                    <Save size={18} />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Profile Picture and Basic Info */}
        <div className="relative px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 sm:gap-6 -mt-20 sm:-mt-24 md:-mt-28">
            <motion.div
              className="relative"
              variants={itemVariants}
              whileHover={isEditing ? { scale: 1.05 } : {}}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar
                src={avatarSrc}
                name={fullName}
                className="!h-32 !w-32 sm:!h-40 sm:!w-40 md:!h-48 md:!w-48 !text-5xl sm:!text-6xl md:!text-7xl border-4 !rounded-lg border-white shadow-xl"
              />
              {isEditing && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <motion.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="absolute bottom-2 right-2 p-3 bg-slate-800 text-white rounded-full shadow-lg hover:bg-slate-900 active:bg-slate-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="Upload profile picture"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isUploadingImage ? (
                      <motion.div
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Camera size={20} />
                    )}
                  </motion.button>
                </>
              )}
            </motion.div>

            <div className="flex-1 mb-0 sm:mb-4 w-full">
              <AnimatePresence mode="wait">
                {!isEditing ? (
                  <motion.div
                    key="view"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-10 break-words text-blue-950 lg:text-white">
                      {profileData.firstName || account?.firstName || ""}{" "}
                      {profileData.middleName || account?.middleName || ""}{" "}
                      {profileData.lastName || account?.lastName || ""}
                    </h1>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {(profileData.position || (Array.isArray(account?.position) ? account?.position[0] : account?.position)) && (
                        <span className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
                          {profileData.position || (Array.isArray(account?.position) ? account?.position[0] : account?.position)}
                        </span>
                      )}
                      {(profileData.idNumber || account?.idNumber) && (
                        <button
                          onClick={() => handleCopyId(profileData.idNumber || account?.idNumber || "")}
                          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 text-slate-600 hover:text-slate-800 rounded-full text-xs sm:text-sm font-medium transition-all hover:bg-slate-200 active:scale-95 shadow-sm border border-slate-200/50 group"
                          title="Click to copy ID"
                        >
                          ID: {profileData.idNumber || account?.idNumber}
                          <div className="w-[1px] h-3 bg-slate-300 group-hover:bg-slate-400 transition-colors mx-1" />
                          {isCopied ? (
                            <Check size={14} className="text-green-600" />
                          ) : (
                            <Copy size={14} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 w-full"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        placeholder="First Name"
                        className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base min-h-[44px] text-slate-800 shadow-sm hover:border-slate-400"
                      />
                      <input
                        type="text"
                        value={profileData.middleName}
                        onChange={(e) => handleInputChange("middleName", e.target.value)}
                        placeholder="Middle Name"
                        className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base min-h-[44px] text-slate-800 shadow-sm hover:border-slate-400"
                      />
                      <input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-4 py-2.5 bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base min-h-[44px] text-slate-800 shadow-sm hover:border-slate-400 sm:col-span-2 md:col-span-1"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sections */}
          <motion.div
            className="mt-8 sm:mt-10 md:mt-12 space-y-4"
            variants={containerVariants}
          >
            {sections.map((section) => (
              <ProfileSectionCard
                key={section.id}
                section={section}
                profileData={profileData}
                account={account}
                isEditing={isEditing}
                expanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onChange={handleInputChange}
                onAction={(actionId) => {
                  if (actionId === "change_password") {
                    setIsPasswordModalOpen(true);
                  }
                }}
                isInGeoFence={isInGeoFence}
              />
            ))}
          </motion.div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </motion.div>
  );
}

interface ProfileSectionCardProps {
  section: SectionConfig;
  profileData: ProfileData;
  account: AccountType | null;
  isEditing: boolean;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: EditableField, value: string | number) => void;
  onAction?: (actionId: string) => void;
  isInGeoFence?: boolean;
}

function ProfileSectionCard({
  section,
  profileData,
  account,
  isEditing,
  expanded,
  onToggle,
  onChange,
  onAction,
  isInGeoFence,
}: ProfileSectionCardProps) {
  return (
    <motion.div
      className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
      variants={itemVariants}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg text-slate-700 shadow-sm">
            {section.icon}
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            {section.title}
          </h2>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-slate-500" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 space-y-4 border-t border-slate-200">
              {section.fields.map((field, index) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <InfoField
                    icon={field.icon}
                    label={field.label}
                    value={
                      (() => {
                        const val = profileData[field.key];
                        // If value is empty/null/undefined, check if we can get it from account
                        if (!val && val !== 0 && val !== false) {
                          // Map profileData keys to account keys
                          const accountKey = field.key === 'workInfo' ? 'department' : field.key;
                          const accountVal = account?.[accountKey as keyof AccountType];
                          if (accountVal !== null && accountVal !== undefined) {
                            if (typeof accountVal === "boolean") return accountVal ? "Yes" : "No";
                            return accountVal;
                          }
                          return "";
                          return "";
                        }
                        if (typeof val === "boolean") return val ? "Yes" : "No";
                        if (Array.isArray(val)) return val.join(", ");
                        return val;
                      })()
                    }
                    isEditing={isEditing && field.editable !== false}
                    onChange={(value) => onChange(field.key, value)}
                    type={field.type}
                    multiline={field.multiline}
                    format={field.format}
                    isInGeoFence={isInGeoFence}
                  />
                </motion.div>
              ))}

              {section.id === "account" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: section.fields.length * 0.05 }}
                  className="pt-4 mt-4 border-t border-slate-200"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2 sm:p-2.5 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0 shadow-sm">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Password</p>
                        <p className="text-xs text-slate-500">Last changed recently</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onAction?.("change_password")}
                      className="px-4 py-2 bg-white border border-slate-200 text-blue-600 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                    >
                      Change Password
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface InfoFieldProps {
  icon: React.ReactNode;
  label: string;
  value: string | number | string[];
  isEditing?: boolean;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
  format?: (value: any) => string;
  isInGeoFence?: boolean;
}

function InfoField({
  icon,
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  multiline = false,
  format,
  isInGeoFence,
}: InfoFieldProps) {
  const [showValue, setShowValue] = useState(false);

  const displayValue =
    !isEditing && format
      ? format(value)
      : value !== null && value !== undefined
        ? Array.isArray(value)
          ? value.join(", ")
          : String(value)
        : "";

  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="p-2 sm:p-2.5 bg-white rounded-lg text-slate-600 mt-1 flex-shrink-0 shadow-sm">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-xs sm:text-sm font-medium text-slate-600 mb-1.5 block">
          {label}
        </label>
        <AnimatePresence mode="wait">
          {!isEditing ? (
            <div className="flex items-center justify-between gap-2">
              <motion.p
                key="view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm sm:text-base text-slate-800 font-medium break-words"
              >
                {type === "password" && !showValue ? (
                  "••••••••"
                ) : displayValue ? (
                  displayValue
                ) : (
                  <span className="text-slate-400 italic">Not provided</span>
                )}
              </motion.p>
              {type === "password" && value && (
                <button
                  type="button"
                  onClick={() => {
                    if (!isInGeoFence) {
                      toast.error("Access Denied: You must be at the designated office location to view the password.");
                      return;
                    }
                    setShowValue(!showValue);
                  }}
                  className={`p-1 rounded-lg transition-colors ${!isInGeoFence
                    ? "text-slate-300 cursor-not-allowed cursor-help"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                    }`}
                  title={
                    !isInGeoFence
                      ? "Restricted: Requires office location access"
                      : showValue ? "Hide password" : "Show password"
                  }
                >
                  {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              )}
            </div>
          ) : multiline ? (
            <motion.textarea
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              value={displayValue}
              onChange={(e) => onChange(e.target.value)}
              rows={3}
              className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm sm:text-base min-h-[44px] shadow-sm"
            />
          ) : (
            <motion.input
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type={type}
              value={displayValue}
              onChange={(e) => {
                const val = e.target.value;
                if (type === "number") {
                  onChange(val === "" ? "0" : val);
                } else {
                  onChange(val);
                }
              }}
              className="w-full px-3 sm:px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm sm:text-base min-h-[44px] shadow-sm"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
