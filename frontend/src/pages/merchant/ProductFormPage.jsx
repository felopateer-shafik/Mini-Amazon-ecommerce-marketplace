import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Image,
  X,
  Loader2,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import FileUpload from "@/components/ui/FileUpload";
import Toggle from "@/components/ui/Toggle";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useCreateProduct,
  useUpdateProduct,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminProduct,
  useAdminCreateCategory,
  useAdminCreateBrand,
  useMerchantProduct,
  useCategories,
  useBrands,
  useMerchantSubmitCategoryRequest,
  useMerchantSubmitBrandRequest,
} from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { merchantService, adminService } from "@/api/services";

export default function ProductFormPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const isAdmin =
    user?.is_system_admin === true ||
    (user?.role && !["customer", "merchant", "wholesale"].includes(user.role));
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const [images, setImages] = useState([]);
  const [productType, setProductType] = useState("simple");
  const { data: categoriesRes, isLoading: isLoadingCategories } =
    useCategories();
  const { data: brandsRes, isLoading: isLoadingBrands } = useBrands();
  const categories = categoriesRes?.data ?? categoriesRes ?? [];
  const brands = brandsRes?.data ?? brandsRes ?? [];
  const [hasDiscount, setHasDiscount] = useState(false);

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const adminCreateProductMutation = useAdminCreateProduct();
  const adminUpdateProductMutation = useAdminUpdateProduct();
  const adminCreateCategoryMutation = useAdminCreateCategory();
  const adminCreateBrandMutation = useAdminCreateBrand();
  const submitCategoryRequestMutation = useMerchantSubmitCategoryRequest();
  const submitBrandRequestMutation = useMerchantSubmitBrandRequest();
  const loading =
    createProductMutation.isPending ||
    updateProductMutation.isPending ||
    adminCreateProductMutation.isPending ||
    adminUpdateProductMutation.isPending;

  // If editing, fetch the product data to populate form
  const { data: merchantProductData, isLoading: isLoadingMerchantProduct } =
    useMerchantProduct(id, { enabled: !isAdmin });
  const { data: adminProductData, isLoading: isLoadingAdminProduct } =
    useAdminProduct(isAdmin ? id : null);

  const productData = isAdmin ? adminProductData : merchantProductData;
  const isLoadingProduct = isAdmin
    ? isLoadingAdminProduct
    : isLoadingMerchantProduct;

  const existingProduct = isEdit
    ? (productData?.data ?? productData ?? null)
    : null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      category: "",
      brandName: "",
    },
  });

  const watchedNewCategoryRequest = watch("newCategoryRequest");
  const watchedNewBrandRequest = watch("newBrandRequest");
  const shouldRequireCategory = !String(watchedNewCategoryRequest || "").trim();
  const shouldRequireBrand = !String(watchedNewBrandRequest || "").trim();

  // Populate form when product data loads
  useEffect(() => {
    if (isEdit && existingProduct) {
      const dimensions = existingProduct.dimensions || {};
      const mappedVariants = Array.isArray(existingProduct.variants)
        ? existingProduct.variants
            .map((variant) => {
              const valuesFromAttributes = Array.isArray(
                variant?.attributes?.values,
              )
                ? variant.attributes.values.join(", ")
                : variant?.attributes?.values_text;
              return {
                option: variant?.name ?? "",
                values: variant?.values ?? valuesFromAttributes ?? "",
              };
            })
            .filter(
              (variant) =>
                String(variant.option || "").trim() !== "" ||
                String(variant.values || "").trim() !== "",
            )
        : [];

      reset({
        name: existingProduct.name ?? "",
        sku: existingProduct.sku ?? "",
        price: existingProduct.price ?? "",
        costPrice: existingProduct.cost_price ?? "",
        stock: existingProduct.stock_quantity ?? "",
        category:
          existingProduct.category_id ?? existingProduct.category?.id ?? "",
        brand: existingProduct.brand_id ?? existingProduct.brand?.id ?? "",
        newCategoryRequest: "",
        newBrandRequest: "",
        description: existingProduct.description ?? "",
        shortDescription: existingProduct.short_description ?? "",
        comparePrice: existingProduct.compare_price ?? "",
        metaTitle: existingProduct.meta_title ?? "",
        metaDescription: existingProduct.meta_description ?? "",
        tags: existingProduct.tags?.join(", ") ?? "",
        weight: existingProduct.weight ?? "",
        length: dimensions.length ?? "",
        width: dimensions.width ?? "",
        height: dimensions.height ?? "",
        minOrder: existingProduct.min_order_quantity ?? "",
        maxOrder: existingProduct.max_order_quantity ?? "",
        wholesalePrice: existingProduct.wholesale_price ?? "",
        wholesaleMinQty: existingProduct.wholesale_min_qty ?? "",
        variants: mappedVariants,
      });
      setProductType(existingProduct.product_type ?? "simple");
      if (existingProduct.compare_price) setHasDiscount(true);
      if (existingProduct.images?.length) {
        setImages(existingProduct.images);
      } else if (existingProduct.image) {
        setImages([existingProduct.image]);
      }
    }
  }, [isEdit, existingProduct, reset]);
  const {
    fields: variants,
    append: addVariant,
    remove: removeVariant,
  } = useFieldArray({ control, name: "variants" });

  const uploadFileToServer = async (file) => {
    const res = isAdmin
      ? await adminService.uploadMedia(file)
      : await merchantService.uploadMedia(file);
    return res.data?.url ?? res.url;
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const onSubmit = async (data) => {
    try {
      if (!Array.isArray(images) || images.length === 0) {
        toast.error(t("merchant.productImages") + " " + t("common.required"));
        return;
      }

      const mappedImages = await Promise.all(
        (images || []).map(async (item) => {
          if (typeof item === "string") return item;
          if (item instanceof File) {
            try {
              return await uploadFileToServer(item);
            } catch (uploadErr) {
              // Fallback to base64 for images if upload fails (e.g. not a merchant yet)
              if (item.type?.startsWith("image/")) return fileToDataUrl(item);
              const serverMsg = uploadErr?.response?.data?.message;
              toast.error(serverMsg || `Failed to upload: ${item.name}`);
              return null;
            }
          }
          return null;
        }),
      );

      const payload = {
        name: data.name,
        description: data.description,
        short_description: data.shortDescription,
        sku: data.sku,
        price: parseFloat(data.price),
        cost_price: data.costPrice ? parseFloat(data.costPrice) : null,
        compare_price:
          hasDiscount && data.comparePrice
            ? parseFloat(data.comparePrice)
            : null,
        stock_quantity: parseInt(data.stock, 10),
        category_id: data.category ? parseInt(data.category, 10) : null,
        brand_id: data.brand ? parseInt(data.brand, 10) : null,
        meta_title: data.metaTitle,
        meta_description: data.metaDescription,
        tags: data.tags ? data.tags.split(",").map((t) => t.trim()) : [],
        weight: parseFloat(data.weight),
        dimensions: {
          length: parseFloat(data.length),
          width: parseFloat(data.width),
          height: parseFloat(data.height),
        },
        images: mappedImages.filter(Boolean),
        variants: data.variants,
        product_type: productType,
        wholesale_price: data.wholesalePrice
          ? parseFloat(data.wholesalePrice)
          : null,
        wholesale_min_qty: data.wholesaleMinQty
          ? parseInt(data.wholesaleMinQty, 10)
          : null,
        min_order_quantity: data.minOrder ? parseInt(data.minOrder, 10) : null,
        max_order_quantity: data.maxOrder ? parseInt(data.maxOrder, 10) : null,
      };

      if (
        hasDiscount &&
        payload.compare_price &&
        payload.compare_price <= payload.price
      ) {
        toast.error(t("merchant.comparePriceGreaterThanPrice"));
        return;
      }

      const newCategoryRequest = (data.newCategoryRequest || "").trim();
      const newBrandRequest = (data.newBrandRequest || "").trim();

      if (newCategoryRequest) {
        const categoryExists = categories.some(
          (category) =>
            String(category?.name || "")
              .trim()
              .toLowerCase() === newCategoryRequest.toLowerCase(),
        );
        if (categoryExists) {
          toast.error("This category already exists.");
          return;
        }
      }

      if (newBrandRequest) {
        const brandExists = brands.some(
          (brand) =>
            String(brand?.name || "")
              .trim()
              .toLowerCase() === newBrandRequest.toLowerCase(),
        );
        if (brandExists) {
          toast.error("This brand already exists.");
          return;
        }
      }

      if (newCategoryRequest) {
        if (isAdmin) {
          await adminCreateCategoryMutation.mutateAsync({
            name: newCategoryRequest,
            description: `Added from product form: ${data.name}`,
            is_active: true,
          });
        } else {
          await submitCategoryRequestMutation.mutateAsync({
            name: newCategoryRequest,
            description: `Requested from product form: ${data.name}`,
          });
        }
      }

      if (newBrandRequest) {
        if (isAdmin) {
          await adminCreateBrandMutation.mutateAsync({
            name: newBrandRequest,
            status: "active",
          });
        } else {
          await submitBrandRequestMutation.mutateAsync({
            name: newBrandRequest,
            description: `Requested from product form: ${data.name}`,
          });
        }
      }

      if (isEdit) {
        if (isAdmin) {
          await adminUpdateProductMutation.mutateAsync({ id, data: payload });
        } else {
          await updateProductMutation.mutateAsync({ id, data: payload });
        }
      } else {
        if (isAdmin) {
          await adminCreateProductMutation.mutateAsync(payload);
        } else {
          await createProductMutation.mutateAsync(payload);
        }
      }

      toast.success(t("merchant.productSaved"));
      navigate(isAdmin ? "/admin/products" : "/merchant/products");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("merchant.productSaveFailed"),
      );
    }
  };

  if (isEdit && isLoadingProduct) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-text">
              {isEdit ? t("merchant.editProduct") : t("merchant.addNewProduct")}
            </h1>
            <p className="text-sm text-text-secondary">
              {isEdit
                ? t("merchant.updateProductInfo")
                : t("merchant.createProductListing")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 grow-1 justify-end">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={loading}
            icon={Save}
          >
            {t("merchant.saveProduct")}
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.basicInformation")}
            </h2>
            <div className="space-y-4">
              <Input
                label={t("merchant.productName")}
                placeholder={t("merchant.enterProductName")}
                {...register("name", {
                  required: t("merchant.productNameRequired"),
                })}
                error={errors.name?.message}
                required
              />
              <Textarea
                label={t("merchant.productDescription")}
                placeholder={t("merchant.productDescription") + "..."}
                {...register("description", {
                  required: t("merchant.descriptionRequired"),
                })}
                error={errors.description?.message}
                rows={5}
                required
              />
              <Textarea
                label={t("merchant.shortDescription")}
                placeholder={t("merchant.briefSummary")}
                {...register("shortDescription")}
                rows={2}
              />
            </div>
          </div>

          {/* Images */}
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.productImages")}
            </h2>
            <FileUpload
              onDrop={(files) => setImages((prev) => [...prev, ...files])}
              files={images}
              onRemove={(i) => setImages(images.filter((_, idx) => idx !== i))}
              onReorder={(fromIndex, toIndex) => {
                setImages((prev) => {
                  const next = [...prev];
                  const [moved] = next.splice(fromIndex, 1);
                  next.splice(toIndex, 0, moved);
                  return next;
                });
              }}
              maxFiles={8}
              accept={{ "image/*": [], "video/*": [] }}
            />
            {images.length === 0 && (
              <p className="text-sm text-danger mt-2">
                {t("merchant.productImages")} {t("common.required")}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.pricingInventory")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={`${t("merchant.productPrice")} (EGP)`}
                type="number"
                step="0.01"
                {...register("price", {
                  required:
                    t("merchant.productPrice") + " " + t("common.required"),
                  min: {
                    value: 0.01,
                    message: t("merchant.mustBeGreaterThanZero"),
                  },
                })}
                error={errors.price?.message}
                required
              />
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <label className="text-sm font-medium text-text">
                    {t("merchant.discountPrice")}
                  </label>
                  <Toggle checked={hasDiscount} onChange={setHasDiscount} />
                </div>
                {hasDiscount && (
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={t("merchant.comparePricePlaceholder")}
                    {...register("comparePrice", {
                      validate: (v) => {
                        if (!v) return true;
                        const price = parseFloat(watch("price"));
                        const comparePrice = parseFloat(v);
                        if (isNaN(comparePrice) || comparePrice <= 0)
                          return t("merchant.mustBeGreaterThanZero");
                        if (!isNaN(price) && comparePrice <= price)
                          return t("merchant.comparePriceGreaterThanPrice");
                        return true;
                      },
                    })}
                    error={errors.comparePrice?.message}
                  />
                )}
              </div>
              <Input
                label={t("merchant.costPrice")}
                type="number"
                step="0.01"
                {...register("costPrice", {
                  min: {
                    value: 0,
                    message: t("merchant.cannotBeNegative"),
                  },
                })}
                error={errors.costPrice?.message}
              />
              <Input
                label={t("merchant.productSKU")}
                placeholder="e.g. WH-1000"
                {...register("sku")}
                error={errors.sku?.message}
              />
              <Input
                label={t("merchant.stockQuantity")}
                type="number"
                {...register("stock", {
                  required: t("merchant.stockRequired"),
                  min: { value: 0, message: t("merchant.cannotBeNegative") },
                })}
                error={errors.stock?.message}
                required
              />
              <Input
                label={t("merchant.minOrderQuantity")}
                type="number"
                defaultValue={1}
                {...register("minOrder")}
              />
              <Input
                label={t("merchant.maxOrderQuantity")}
                type="number"
                {...register("maxOrder")}
              />
            </div>
          </div>

          {/* Variants */}
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text">
                {t("merchant.variants")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => addVariant({ option: "", values: "" })}
              >
                {t("merchant.addVariant")}
              </Button>
            </div>
            {variants.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">
                {t("merchant.noVariants")}
              </p>
            ) : (
              <div className="space-y-3">
                {variants.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start">
                    <Input
                      placeholder={t("merchant.optionNamePlaceholder")}
                      {...register(`variants.${index}.option`)}
                    />
                    <Input
                      placeholder={t("merchant.optionValuesPlaceholder")}
                      {...register(`variants.${index}.values`)}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="p-2 text-text-secondary hover:text-danger mt-0.5"
                      aria-label={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO */}
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.seo")}
            </h2>
            <div className="space-y-4">
              <Input
                label={t("merchant.metaTitle")}
                placeholder={t("merchant.seoTitlePlaceholder")}
                {...register("metaTitle")}
              />
              <Textarea
                label={t("merchant.metaDescription")}
                placeholder={t("merchant.seoDescriptionPlaceholder")}
                {...register("metaDescription")}
                rows={2}
              />
              <Input
                label={t("merchant.productTags")}
                placeholder={t("merchant.tagsPlaceholder")}
                {...register("tags")}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.organization")}
            </h2>
            <div className="space-y-4">
              <Select
                label={t("merchant.productType")}
                options={[
                  { value: "simple", label: t("merchant.simpleProduct") },
                  { value: "variable", label: t("merchant.variableProduct") },
                  { value: "digital", label: t("merchant.digitalProduct") },
                ]}
                value={productType}
                onChange={(e) => setProductType(e.target.value)}
              />
              <Select
                label={t("merchant.productCategory")}
                options={[
                  {
                    value: "",
                    label: isLoadingCategories
                      ? t("merchant.loadingCategories")
                      : t("merchant.selectCategory"),
                  },
                  ...categories.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
                {...register("category", {
                  validate: (value) => {
                    if (!shouldRequireCategory) return true;
                    return value ? true : t("merchant.categoryRequired");
                  },
                })}
                error={errors.category?.message}
                disabled={isLoadingCategories}
                required={shouldRequireCategory}
              />
              <Select
                label={t("admin.brandName")}
                options={[
                  {
                    value: "",
                    label: isLoadingBrands
                      ? t("merchant.loadingBrands")
                      : t("merchant.selectBrand"),
                  },
                  ...brands.map((brand) => ({
                    value: String(brand.id),
                    label: brand.name,
                  })),
                ]}
                {...register("brand", {
                  validate: (value) => {
                    if (!shouldRequireBrand) return true;
                    return value
                      ? true
                      : `${t("admin.brandName")} ${t("common.required")}`;
                  },
                })}
                error={errors.brand?.message}
                disabled={isLoadingBrands}
                required={shouldRequireBrand}
              />

              <Input
                label={t("merchant.requestNewCategory")}
                placeholder={t("merchant.requestNewCategoryPlaceholder")}
                {...register("newCategoryRequest")}
              />

              <Input
                label={t("merchant.requestNewBrand")}
                placeholder={t("merchant.requestNewBrandPlaceholder")}
                {...register("newBrandRequest")}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.statusSection")}
            </h2>
            <p className="text-sm text-text-secondary">
              {t("merchant.statusSectionDescription")}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.shippingSection")}
            </h2>
            <div className="space-y-3">
              <Input
                label={t("merchant.weightKg")}
                type="number"
                step="0.01"
                {...register("weight", {
                  required: t("common.required"),
                  min: { value: 0, message: t("merchant.cannotBeNegative") },
                })}
                error={errors.weight?.message}
                required
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  label={t("merchant.lengthCm")}
                  type="number"
                  {...register("length", {
                    required: t("common.required"),
                    min: { value: 0, message: t("merchant.cannotBeNegative") },
                  })}
                  error={errors.length?.message}
                  required
                />
                <Input
                  label={t("merchant.widthCm")}
                  type="number"
                  {...register("width", {
                    required: t("common.required"),
                    min: { value: 0, message: t("merchant.cannotBeNegative") },
                  })}
                  error={errors.width?.message}
                  required
                />
                <Input
                  label={t("merchant.heightCm")}
                  type="number"
                  {...register("height", {
                    required: t("common.required"),
                    min: { value: 0, message: t("merchant.cannotBeNegative") },
                  })}
                  error={errors.height?.message}
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-border/50">
            <h2 className="font-semibold text-text mb-4">
              {t("merchant.wholesaleSection")}
            </h2>
            <div className="space-y-3">
              <Input
                label={t("merchant.minQtyWholesale")}
                type="number"
                {...register("wholesaleMinQty")}
                placeholder={t("merchant.minQtyPlaceholder")}
              />
              <Input
                label={t("merchant.wholesalePriceLabel")}
                type="number"
                step="0.01"
                {...register("wholesalePrice", {
                  validate: (v) => {
                    if (!v) return true;
                    const price = parseFloat(watch("price"));
                    const wp = parseFloat(v);
                    if (isNaN(wp) || wp <= 0)
                      return t("merchant.mustBeGreaterThanZero");
                    if (!isNaN(price) && wp >= price)
                      return t("merchant.wholesaleLessThanPrice");
                    return true;
                  },
                })}
                error={errors.wholesalePrice?.message}
                placeholder={t("merchant.wholesalePricePlaceholder")}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
