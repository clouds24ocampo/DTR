import { useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { addCategory } from "../../../../api/hr/category.api";
import { AnimatePresence, motion } from "framer-motion";
import { backdropVariants, modalVariants } from "../../../../utils/global/motionVariants";
import { InfoIcon } from "../../../common/InfoIcon";

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddCategoryModal({ isOpen, onClose }: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState("");
  const [catLoading, setCatLoading] = useState(false);

  if (!isOpen) return null;

  const handleAddCategory = async () => {
    if (!categoryName) {
      toast.error("Category name required");
      return;
    }
    setCatLoading(true);
    try {
      const ok = await addCategory({ name: categoryName });
      if (ok) {
        toast.success("Category added");
        setCategoryName("");
        onClose();
      } else {
        toast.error("Failed to add");
        onClose();
      }
    } catch {
      toast.error("Error");
      onClose();
    } finally {
      setCatLoading(false);
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 !mt-0"
        onClick={handleOverlayClick}
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Create category</p>
              <h2 className="text-2xl font-bold text-gray-900">Job category</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-1 mb-2">
                <label className="text-sm text-gray-600">
                  Category name <span className="text-red-500">*</span>
                </label>
                <InfoIcon
                  description="Enter a unique name for the job category. Categories help organize job postings and make them easier to find and filter. Examples: 'Engineering', 'Sales', 'Marketing', 'Operations'. The category name should be clear and descriptive."
                  title="Category Name"
                />
              </div>
              <input
                type="text"
                placeholder="Category name *"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                autoFocus
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAddCategory}
                disabled={!categoryName.trim()}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {catLoading ? (
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
                  "Add category"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
