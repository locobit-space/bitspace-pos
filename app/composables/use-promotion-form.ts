// ============================================
// 🎁 PROMOTION FORM COMPOSABLE
// Form state management and validation for promotions
// ============================================

import type { Promotion } from "~/types";

interface PromotionFormData {
  name: string;
  type: "bogo" | "discount" | "bundle" | "freebie";
  triggerProductIds: string[];
  triggerQuantity: number;
  rewardProductIds: string[];
  rewardQuantity: number;
  badgeText: string;
}

interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export function usePromotionForm() {
  const toast = useToast();
  const { t } = useI18n();

  // Form state
  const form = reactive<PromotionFormData>({
    name: "",
    type: "bogo",
    triggerProductIds: [],
    triggerQuantity: 1,
    rewardProductIds: [],
    rewardQuantity: 1,
    badgeText: "BUY 1 GET 1 FREE",
  });

  const isLoading = ref(false);

  // Reset form to default values
  function resetForm(): void {
    form.name = "";
    form.type = "bogo";
    form.triggerProductIds = [];
    form.triggerQuantity = 1;
    form.rewardProductIds = [];
    form.rewardQuantity = 1;
    form.badgeText = "BUY 1 GET 1 FREE";
  }

  // Validate form data
  function validateForm(): FormValidation {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = t("validation.required", "Name is required");
    } else if (form.name.length < 2) {
      errors.name = t("validation.minLength", "Name must be at least 2 characters");
    } else if (form.name.length > 100) {
      errors.name = t("validation.maxLength", "Name must be less than 100 characters");
    }

    if (form.triggerProductIds.length === 0) {
      errors.triggerProductIds = t("validation.required", "At least one trigger product is required");
    }

    if (form.triggerQuantity < 1) {
      errors.triggerQuantity = t("validation.min", "Quantity must be at least 1");
    } else if (form.triggerQuantity > 999) {
      errors.triggerQuantity = t("validation.max", "Quantity must be less than 1000");
    }

    if (form.rewardQuantity < 1) {
      errors.rewardQuantity = t("validation.min", "Quantity must be at least 1");
    } else if (form.rewardQuantity > 999) {
      errors.rewardQuantity = t("validation.max", "Quantity must be less than 1000");
    }

    if (!form.badgeText.trim()) {
      errors.badgeText = t("validation.required", "Badge text is required");
    } else if (form.badgeText.length > 50) {
      errors.badgeText = t("validation.maxLength", "Badge text must be less than 50 characters");
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  // Show validation errors as toast
  function showValidationError(errors: Record<string, string>): void {
    const firstError = Object.values(errors)[0];
    if (firstError) {
      toast.add({
        title: t("common.validationError", "Validation Error"),
        description: firstError,
        color: "red",
      });
    }
  }

  // Prepare form data for submission
  function prepareSubmissionData(): Omit<Promotion, "id" | "usageCount" | "createdAt" | "updatedAt"> {
    const rewardProductIds = form.rewardProductIds.length > 0 
      ? form.rewardProductIds 
      : form.triggerProductIds;

    return {
      name: form.name.trim(),
      type: form.type as Promotion["type"],
      status: "active" as Promotion["status"],
      triggerProductIds: form.triggerProductIds,
      triggerQuantity: form.triggerQuantity,
      rewardType: "free_product" as Promotion["rewardType"],
      rewardProductIds,
      rewardQuantity: form.rewardQuantity,
      priority: 10,
      badgeText: form.badgeText.trim(),
    };
  }

  return {
    // State
    form: readonly(form),
    isLoading: readonly(isLoading),

    // Methods
    resetForm,
    validateForm,
    showValidationError,
    prepareSubmissionData,
    setLoading: (loading: boolean) => { isLoading.value = loading; },
  };
}
