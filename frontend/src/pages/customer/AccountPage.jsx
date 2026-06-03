import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { useForm } from "react-hook-form";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Bell,
  Shield,
  Camera,
  Plus,
  Trash2,
  Edit2,
  Save,
  Loader2,
  CreditCard,
} from "lucide-react";

const MapAddressPicker = lazy(() => import("@/components/ui/MapAddressPicker"));
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";
import Toggle from "@/components/ui/Toggle";
import Avatar from "@/components/ui/Avatar";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useProfile,
  useUpdateProfile,
  useUploadProfileAvatar,
  usePaymentCards,
  useAddPaymentCard,
  useRemovePaymentCard,
  useSetDefaultPaymentCard,
  useDeleteAccount,
} from "@/hooks/useApi";
import { authService } from "@/api/services";
import toast from "react-hot-toast";

const defaultNotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  newsletter: false,
  sms: true,
  push: false,
};

export default function AccountPage() {
  const { user, updateUser, logout } = useAuthStore();
  const { t } = useTranslation();
  const { data: profileResponse, isLoading: profileLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploadAvatarMutation = useUploadProfileAvatar();
  const avatarInputRef = useRef(null);
  const deleteAccountMutation = useDeleteAccount();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Use API-fetched profile data, fallback to auth store user
  const profileUser = profileResponse?.data ||
    user || { name: "", email: "", phone: "" };
  const createdAtDate = profileUser?.created_at
    ? new Date(profileUser.created_at)
    : null;
  const memberSinceText =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? `${t("account.memberSinceLabel", "Member since")} ${createdAtDate.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      : t("account.memberSince");

  // ─── Addresses API ────────────────────────────────────────────
  const { data: addressesResponse, isLoading: addressesLoading } =
    useAddresses();
  const addresses = (addressesResponse?.data ?? []).map((a) => ({
    id: a.id,
    label: a.label || "Home",
    first_name: a.first_name || "",
    last_name: a.last_name || "",
    phone: a.phone || "",
    address_line_1: a.address_line_1 || "",
    address_line_2: a.address_line_2 || "",
    city: a.city || "",
    state: a.state || "",
    postal_code: a.postal_code || "",
    country: a.country || "",
    is_default: !!a.is_default,
  }));

  const createAddressMutation = useCreateAddress();
  const updateAddressMutation = useUpdateAddress();
  const deleteAddressMutation = useDeleteAddress();

  // ─── Payment Cards API ────────────────────────────────────────
  const { data: cardsResponse, isLoading: cardsLoading } = usePaymentCards();
  const savedCards = cardsResponse?.data || [];
  const addCardMutation = useAddPaymentCard();
  const removeCardMutation = useRemovePaymentCard();
  const setDefaultCardMutation = useSetDefaultPaymentCard();
  const [showCardForm, setShowCardForm] = useState(false);

  const getApiErrorMessage = (err, fallback) => {
    const firstValidationError = Object.values(
      err?.response?.data?.errors || {},
    )
      .flat()
      .find(Boolean);
    return firstValidationError || err?.response?.data?.message || fallback;
  };

  const [editingAddress, setEditingAddress] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Refs for the address modal form fields
  const addrLabelRef = useRef();
  const addrFirstNameRef = useRef();
  const addrLastNameRef = useRef();
  const addrPhoneRef = useRef();
  const addrLine1Ref = useRef();
  const addrLine2Ref = useRef();
  const addrCityRef = useRef();
  const addrStateRef = useRef();
  const addrPostalCodeRef = useRef();
  const addrCountryRef = useRef();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      date_of_birth: "",
    },
  });

  // Sync form when profile data becomes available (from API or store)
  useEffect(() => {
    const src = profileResponse?.data || user;
    if (src) {
      reset({
        name: src.name || "",
        email: src.email || "",
        phone: src.phone || "",
        date_of_birth: src.date_of_birth || "",
      });
    }
  }, [profileResponse, user, reset]);

  const {
    register: registerPw,
    handleSubmit: handlePw,
    formState: { errors: pwErrors },
    watch,
  } = useForm();

  const [notifications, setNotifications] = useState(
    defaultNotificationPreferences,
  );

  useEffect(() => {
    const src = profileResponse?.data || user;
    const saved = src?.notification_preferences;
    if (saved && typeof saved === "object") {
      setNotifications({
        ...defaultNotificationPreferences,
        ...saved,
      });
      return;
    }

    setNotifications(defaultNotificationPreferences);
  }, [profileResponse, user]);

  const onSaveProfile = async (data) => {
    try {
      const res = await updateProfileMutation.mutateAsync(data);
      // res is { success, data: { id, name, email, ... }, message }
      const updated = res?.data || data;
      updateUser(updated);
      reset({
        name: updated.name || data.name || "",
        email: updated.email || data.email || "",
        phone: updated.phone || data.phone || "",
        date_of_birth: updated.date_of_birth || data.date_of_birth || "",
      });
      toast.success(t("account.profileUpdated"));
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error(
        getApiErrorMessage(
          err,
          t("account.profileUpdateFailed") || "Failed to update profile",
        ),
      );
    }
  };

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await uploadAvatarMutation.mutateAsync(formData);
      const updated = res?.data;
      if (updated) {
        updateUser(updated);
      }
      toast.success(t("account.profileUpdated"));
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          t("account.profileUpdateFailed") || "Failed to update profile",
        ),
      );
    } finally {
      event.target.value = "";
    }
  };

  const avatarSrc =
    profileUser?.avatar && typeof profileUser.avatar === "string"
      ? profileUser.avatar
      : undefined;
  const onChangePassword = async (data) => {
    try {
      await authService.changePassword({
        current_password: data.currentPassword,
        password: data.newPassword,
        password_confirmation: data.confirmPassword,
      });
      toast.success(t("account.passwordChanged"));
    } catch {
      toast.error(
        t("account.passwordChangeFailed") || "Failed to change password",
      );
    }
  };

  const collectAddressForm = () => ({
    label: addrLabelRef.current?.value || "Home",
    first_name: addrFirstNameRef.current?.value || "",
    last_name: addrLastNameRef.current?.value || "",
    phone: addrPhoneRef.current?.value || "",
    address_line_1: addrLine1Ref.current?.value || "",
    address_line_2: addrLine2Ref.current?.value || "",
    city: addrCityRef.current?.value || "",
    state: addrStateRef.current?.value || "",
    postal_code: addrPostalCodeRef.current?.value || "",
    country: addrCountryRef.current?.value || "",
  });

  const handleSaveAddress = async () => {
    const payload = collectAddressForm();
    try {
      if (editingAddress) {
        await updateAddressMutation.mutateAsync({
          id: editingAddress.id,
          data: payload,
        });
        toast.success(t("account.addressUpdated"));
      } else {
        await createAddressMutation.mutateAsync(payload);
        toast.success(t("account.addressAdded"));
      }
      setShowAddressModal(false);
    } catch {
      toast.error(t("account.addressSaveFailed") || "Failed to save address");
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await deleteAddressMutation.mutateAsync(id);
      toast.success(t("account.addressDeleted"));
    } catch {
      toast.error(
        t("account.addressDeleteFailed") || "Failed to delete address",
      );
    }
  };

  const handleSetDefaultAddress = async (addr) => {
    try {
      await updateAddressMutation.mutateAsync({
        id: addr.id,
        data: { is_default: true },
      });
      toast.success(t("account.defaultAddressUpdated"));
    } catch {
      toast.error(
        t("account.defaultAddressFailed") || "Failed to set default address",
      );
    }
  };

  const handleNotificationToggle = async (key, value, label) => {
    const next = { ...notifications, [key]: value };
    const previous = notifications;
    setNotifications(next);

    try {
      const res = await updateProfileMutation.mutateAsync({
        notification_preferences: next,
      });
      const updated = res?.data;
      if (updated) {
        updateUser(updated);
      }

      toast.success(
        `${label} ${value ? t("common.enabled") : t("common.disabled")}`,
      );
    } catch {
      setNotifications(previous);
      toast.error(
        t("account.profileUpdateFailed") || "Failed to update profile",
      );
    }
  };

  const tabs = [
    {
      id: "profile",
      label: t("account.profile"),
      content: (
        <form
          onSubmit={handleSubmit(onSaveProfile)}
          className="space-y-4 sm:space-y-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <Avatar
                src={avatarSrc}
                name={profileUser?.name || "User"}
                size="xl"
              />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={handleAvatarButtonClick}
                disabled={uploadAvatarMutation.isPending}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow border-2 border-white"
                aria-label="Change photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h3 className="font-semibold text-text">
                {profileUser?.name || "User"}
              </h3>
              <p className="text-sm text-text-secondary">
                {memberSinceText}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("account.fullName")}
              icon={User}
              placeholder="Enter full name"
              {...register("name", { required: t("account.nameRequired") })}
              error={errors.name?.message}
            />
            <Input
              label={t("account.emailAddress")}
              type="email"
              icon={Mail}
              placeholder="Enter email"
              {...register("email", { required: t("account.emailRequired") })}
              error={errors.email?.message}
            />
            <Input
              label={t("account.phoneNumber")}
              type="tel"
              icon={Phone}
              placeholder="Enter phone"
              {...register("phone")}
            />
            <Input
              label={t("account.dateOfBirth")}
              type="date"
              {...register("date_of_birth")}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" icon={Save}>
              {t("account.saveChanges")}
            </Button>
          </div>
        </form>
      ),
    },
    {
      id: "addresses",
      label: t("account.addresses"),
      content: (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">
              {t("account.savedAddresses")}
            </h3>
            <Button
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditingAddress(null);
                setShowAddressModal(true);
              }}
            >
              {t("account.addNew")}
            </Button>
          </div>
          {addressesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-8">
              {t("account.noAddresses") || "No saved addresses yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-4 rounded-lg border-2 ${addr.is_default ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {addr.label}
                      {addr.is_default && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                          {t("common.default")}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingAddress(addr);
                          setShowAddressModal(true);
                        }}
                        className="p-1 text-text-secondary hover:text-accent"
                        aria-label="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        disabled={deleteAddressMutation.isPending}
                        className="p-1 text-text-secondary hover:text-danger"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-text">
                    {addr.first_name} {addr.last_name}
                  </p>
                  <p className="text-sm text-text-secondary">{addr.phone}</p>
                  <p className="text-sm text-text-secondary">
                    {addr.address_line_1}
                    {addr.address_line_2
                      ? `, ${addr.address_line_2}`
                      : ""}, {addr.city}, {addr.state} {addr.postal_code}
                  </p>
                  {addr.country && (
                    <p className="text-sm text-text-secondary">
                      {addr.country}
                    </p>
                  )}
                  {!addr.is_default && (
                    <button
                      onClick={() => handleSetDefaultAddress(addr)}
                      className="text-xs text-accent hover:underline mt-2"
                    >
                      {t("account.setAsDefault")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "security",
      label: t("account.security"),
      content: (
        <div className="space-y-4 sm:space-y-6">
          <form onSubmit={handlePw(onChangePassword)} className="space-y-4">
            <h3 className="font-semibold text-text">
              {t("account.changePassword")}
            </h3>
            <Input
              label={t("account.currentPassword")}
              type="password"
              icon={Lock}
              {...registerPw("currentPassword", {
                required: t("common.required"),
              })}
              error={pwErrors.currentPassword?.message}
            />
            <Input
              label={t("account.newPassword")}
              type="password"
              icon={Lock}
              {...registerPw("newPassword", {
                required: t("common.required"),
                minLength: { value: 8, message: t("account.min8Characters") },
              })}
              error={pwErrors.newPassword?.message}
            />
            <Input
              label={t("account.confirmNewPassword")}
              type="password"
              icon={Lock}
              {...registerPw("confirmPassword", {
                required: t("common.required"),
                validate: (v) =>
                  v === watch("newPassword") || t("account.passwordsNoMatch"),
              })}
              error={pwErrors.confirmPassword?.message}
            />
            <Button type="submit" icon={Shield}>
              {t("account.updatePassword")}
            </Button>
          </form>
          <hr className="border-border" />
          <div>
            <h3 className="font-semibold text-text mb-2">
              {t("account.twoFactorAuth")}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {t("account.twoFactorDescription")}
            </p>
            <Button
              variant="outline"
              onClick={() => toast.info(t("common.comingSoon"))}
            >
              {t("account.enable2FA")}
            </Button>
          </div>
          <hr className="border-border" />
          <div>
            <h3 className="font-semibold text-text mb-2 text-danger">
              {t("account.deleteAccount")}
            </h3>
            <p className="text-sm text-text-secondary mb-3">
              {t("account.deleteAccountDescription")}
            </p>
            <Button
              variant="outline"
              className="!border-danger !text-danger hover:!bg-danger/5"
              onClick={() => { setDeletePassword(""); setDeleteError(""); setShowDeleteModal(true); }}
            >
              {t("account.deleteAccount")}
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      label: t("account.notifications"),
      content: (
        <div className="space-y-4">
          <h3 className="font-semibold text-text">
            {t("account.notificationPreferences")}
          </h3>
          {[
            {
              key: "orderUpdates",
              label: t("account.orderUpdates"),
              desc: t("account.orderUpdatesDesc"),
            },
            {
              key: "promotions",
              label: t("account.promotionsDeals"),
              desc: t("account.promotionsDealsDesc"),
            },
            {
              key: "newsletter",
              label: t("account.newsletter"),
              desc: t("account.newsletterDesc"),
            },
            {
              key: "sms",
              label: t("account.smsNotifications"),
              desc: t("account.smsDesc"),
            },
            {
              key: "push",
              label: t("account.pushNotifications"),
              desc: t("account.pushDesc"),
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50"
            >
              <div>
                <p className="text-sm font-medium text-text">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.desc}</p>
              </div>
              <Toggle
                checked={notifications[item.key]}
                onChange={(val) =>
                  handleNotificationToggle(item.key, val, item.label)
                }
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "cards",
      label: t("account.savedCards") || "Saved Cards",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text">
              {t("account.savedCardsTitle") || "Payment Cards"}
            </h3>
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setShowCardForm(!showCardForm)}
            >
              {t("account.addCard") || "Add Card"}
            </Button>
          </div>

          {showCardForm && (
            <form
              className="p-4 border border-border rounded-lg space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                try {
                  await addCardMutation.mutateAsync({
                    card_number: fd.get("card_number"),
                    card_holder_name: fd.get("card_holder_name"),
                    expiry_month: fd.get("expiry_month"),
                    expiry_year: fd.get("expiry_year"),
                    billing_address: fd.get("billing_address") || null,
                  });
                  toast.success(t("account.cardSaved") || "Card saved successfully.");
                  setShowCardForm(false);
                  e.target.reset();
                } catch (err) {
                  toast.error(err?.response?.data?.message || "Failed to save card.");
                }
              }}
            >
              <Input
                name="card_number"
                label={t("account.cardNumber") || "Card Number"}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                required
              />
              <Input
                name="card_holder_name"
                label={t("account.cardHolderName") || "Cardholder Name"}
                placeholder="John Doe"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  name="expiry_month"
                  label={t("account.expiryMonth") || "Expiry Month"}
                  placeholder="MM"
                  maxLength={2}
                  required
                />
                <Input
                  name="expiry_year"
                  label={t("account.expiryYear") || "Expiry Year"}
                  placeholder="YY"
                  maxLength={4}
                  required
                />
              </div>
              <Input
                name="billing_address"
                label={t("account.billingAddress") || "Billing Address (optional)"}
                placeholder="123 Main St, Cairo"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCardForm(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" loading={addCardMutation.isPending}>
                  {t("common.save")}
                </Button>
              </div>
            </form>
          )}

          {cardsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : savedCards.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-text-secondary/40 mb-3" />
              <p className="text-text-secondary">
                {t("account.noSavedCards") || "No saved cards yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedCards.map((card) => (
                <div
                  key={card.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition ${card.is_default ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-text text-sm">
                        {card.card_brand} •••• {card.card_last_four}
                        {card.is_default && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {t("common.default")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {card.card_holder_name} · {t("account.expires") || "Expires"} {card.expiry_month}/{card.expiry_year}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await setDefaultCardMutation.mutateAsync(card.id);
                            toast.success(t("account.defaultCardSet") || "Default card updated.");
                          } catch {
                            toast.error("Failed to set default card.");
                          }
                        }}
                        loading={setDefaultCardMutation.isPending}
                      >
                        {t("account.setDefault") || "Set Default"}
                      </Button>
                    )}
                    <button
                      onClick={async () => {
                        if (!window.confirm(t("account.confirmDeleteCard") || "Remove this card?")) return;
                        try {
                          await removeCardMutation.mutateAsync(card.id);
                          toast.success(t("account.cardRemoved") || "Card removed.");
                        } catch {
                          toast.error("Failed to remove card.");
                        }
                      }}
                      className="p-2 text-danger hover:bg-danger/5 rounded transition"
                      title="Remove card"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {t("account.cardSecurityNote") || "Your card details are encrypted with AES-256-CBC. Full card numbers are never stored."}
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <Breadcrumb
        items={[
          { label: t("common.home"), href: "/" },
          { label: t("account.myAccount") },
        ]}
      />
      <h1 className="text-xl sm:text-2xl font-bold text-text mt-4 mb-6">
        {t("account.myAccount")}
      </h1>
      <div className="bg-white rounded-xl border border-border/50 p-6">
        <Tabs tabs={tabs} defaultTab="profile" />
      </div>

      <Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title={
          editingAddress ? t("account.editAddress") : t("account.addNewAddress")
        }
      >
        <div className="space-y-3">
          {/* Map Address Picker */}
          <div>
            <p className="text-sm font-medium text-text mb-2 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary" />
              {t("account.pickOnMap") || "Pick address on map"}
            </p>
            <Suspense fallback={<div className="h-[200px] bg-gray-100 rounded-lg flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}>
              <MapAddressPicker
                height="200px"
                onAddressSelect={(mapData) => {
                  if (addrLine1Ref.current && mapData.address) addrLine1Ref.current.value = mapData.address;
                  if (addrCityRef.current && mapData.city) addrCityRef.current.value = mapData.city;
                  if (addrStateRef.current && mapData.state) addrStateRef.current.value = mapData.state;
                  if (addrPostalCodeRef.current && mapData.postal_code) addrPostalCodeRef.current.value = mapData.postal_code;
                  if (addrCountryRef.current && mapData.country) addrCountryRef.current.value = mapData.country;
                }}
              />
            </Suspense>
          </div>
          <Input
            label={t("account.labelPlaceholder")}
            ref={addrLabelRef}
            defaultValue={editingAddress?.label || ""}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("account.firstName") || "First Name"}
              ref={addrFirstNameRef}
              defaultValue={editingAddress?.first_name || ""}
            />
            <Input
              label={t("account.lastName") || "Last Name"}
              ref={addrLastNameRef}
              defaultValue={editingAddress?.last_name || ""}
            />
          </div>
          <Input
            label={t("common.phone")}
            ref={addrPhoneRef}
            defaultValue={editingAddress?.phone || ""}
          />
          <Input
            label={t("common.address")}
            ref={addrLine1Ref}
            defaultValue={editingAddress?.address_line_1 || ""}
          />
          <Input
            label={t("common.addressLine2") || "Address Line 2"}
            ref={addrLine2Ref}
            defaultValue={editingAddress?.address_line_2 || ""}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label={t("common.city")}
              ref={addrCityRef}
              defaultValue={editingAddress?.city || ""}
            />
            <Input
              label={t("common.state")}
              ref={addrStateRef}
              defaultValue={editingAddress?.state || ""}
            />
            <Input
              label={t("common.zipCode")}
              ref={addrPostalCodeRef}
              defaultValue={editingAddress?.postal_code || ""}
            />
          </div>
          <Input
            label={t("common.country") || "Country"}
            ref={addrCountryRef}
            defaultValue={editingAddress?.country || ""}
          />
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowAddressModal(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              fullWidth
              onClick={handleSaveAddress}
              disabled={
                createAddressMutation.isPending ||
                updateAddressMutation.isPending
              }
            >
              {createAddressMutation.isPending ||
              updateAddressMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Delete Account Confirmation Modal ─── */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t("account.confirmDeleteAccountTitle")}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            {t("account.deleteAccountDescription")}
          </p>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              {t("account.enterPasswordToConfirm")}
            </label>
            <input
              type="password"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger/30"
              value={deletePassword}
              onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
              placeholder="••••••••"
            />
            {deleteError && (
              <p className="text-danger text-xs mt-1">{deleteError}</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="danger"
              disabled={!deletePassword || deleteAccountMutation.isPending}
              isLoading={deleteAccountMutation.isPending}
              onClick={async () => {
                try {
                  await deleteAccountMutation.mutateAsync({ password: deletePassword });
                  toast.success(t("account.accountDeleted"));
                  setShowDeleteModal(false);
                  logout();
                } catch (err) {
                  const msg = err?.response?.data?.message ?? t("common.error");
                  setDeleteError(msg);
                }
              }}
            >
              {t("account.deleteAccount")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
