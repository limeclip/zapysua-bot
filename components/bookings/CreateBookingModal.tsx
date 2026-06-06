"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatPhoneInput, normalizeUaPhone } from "@/lib/phone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  BookingWithService,
  CustomerWithStats,
  MasterWithMeta,
  Service,
} from "@/types";
import { LoaderCircle, X } from "lucide-react";

type CreateBookingModalProps = {
  master: MasterWithMeta;
  open: boolean;
  onClose: () => void;
  onCreated: (booking: BookingWithService) => void;
  defaultDate?: string;
};

function toDatetimeLocalValue(isoOrDate: Date): string {
  const d = isoOrDate;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getSearchQuery(name: string, phone: string): string {
  const phoneTrimmed = phone.trim();
  const nameTrimmed = name.trim();
  const phoneDigits = phoneTrimmed.replace(/\D/g, "");

  if (phoneDigits.length >= 3) {
    return phoneTrimmed;
  }
  return nameTrimmed;
}

function formatCustomerLabel(customer: CustomerWithStats): string {
  const phone = customer.phone ? ` (${customer.phone})` : "";
  return `${customer.name}${phone}`;
}

export function CreateBookingModal({
  master,
  open,
  onClose,
  onCreated,
  defaultDate,
}: CreateBookingModalProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<
    CustomerWithStats[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [serviceId, setServiceId] = useState("");
  const [bookingStart, setBookingStart] = useState("");
  const [notes, setNotes] = useState("");
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const searchQuery = getSearchQuery(clientName, clientPhone);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const data = await apiFetch<{ services: Service[] }>("/api/services");
      setServices(data.services);
      if (data.services.length > 0) {
        setServiceId((prev) => prev || data.services[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoadingServices(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
    loadServices();

    if (defaultDate) {
      const base = new Date(`${defaultDate}T10:00:00`);
      setBookingStart(toDatetimeLocalValue(base));
    } else {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
      setBookingStart(toDatetimeLocalValue(now));
    }
  }, [open, defaultDate, loadServices]);

  useEffect(() => {
    if (!open) return;

    if (debouncedSearch.length < 2) {
      setCustomerSuggestions([]);
      return;
    }

    let cancelled = false;

    async function searchCustomers() {
      try {
        const data = await apiFetch<{ customers: CustomerWithStats[] }>(
          `/api/customers?search=${encodeURIComponent(debouncedSearch)}&limit=10`,
        );
        if (!cancelled) {
          setCustomerSuggestions(data.customers);
        }
      } catch {
        if (!cancelled) {
          setCustomerSuggestions([]);
        }
      }
    }

    searchCustomers();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  useEffect(() => {
    if (!showSuggestions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSuggestions]);

  const selectedService = services.find((s) => s.id === serviceId);

  const handleSelectCustomer = (customer: CustomerWithStats) => {
    setClientName(customer.name);
    if (customer.phone) {
      setClientPhone(formatPhoneInput(customer.phone));
    }
    setShowSuggestions(false);
    setCustomerSuggestions([]);
  };

  const handlePhoneChange = (value: string) => {
    setClientPhone(formatPhoneInput(value));
    setShowSuggestions(true);
  };

  const handleSubmit = async () => {
    const trimmedName = clientName.trim();
    if (!trimmedName) {
      setError("Введіть ім'я клієнта");
      return;
    }
    if (!serviceId) {
      setError("Оберіть послугу");
      return;
    }
    if (!bookingStart) {
      setError("Оберіть дату та час");
      return;
    }

    const normalizedPhone = normalizeUaPhone(clientPhone.trim());
    if (!normalizedPhone) {
      setError("Введіть коректний номер телефону");
      return;
    }

    const startDate = new Date(bookingStart);
    if (Number.isNaN(startDate.getTime())) {
      setError("Невірна дата або час");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ booking: BookingWithService }>(
        "/api/bookings",
        {
          method: "POST",
          body: JSON.stringify({
            client_name: trimmedName,
            client_phone: normalizedPhone,
            service_id: serviceId,
            booking_start: startDate.toISOString(),
            duration_minutes: selectedService?.duration_minutes,
            notes: notes.trim() || null,
            status: "confirmed",
          }),
        },
      );
      onCreated(data.booking);
      setClientName("");
      setClientPhone("");
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      setNotes("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка створення");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const hasSuggestions =
    showSuggestions && customerSuggestions.length > 0 && debouncedSearch.length >= 2;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-booking-title"
    >
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-in fade-in">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 id="create-booking-title" className="font-semibold">
            Створити запис вручну
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Закрити"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-3">
          <div className="relative space-y-3" ref={suggestionsRef}>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">Ім&apos;я клієнта *</label>
              <Input
                placeholder="Олена"
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-500">
                Телефон <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="+380..."
                value={clientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                required
                autoComplete="tel"
              />
            </div>

            {hasSuggestions && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {customerSuggestions.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      onClick={() => handleSelectCustomer(customer)}
                    >
                      {formatCustomerLabel(customer)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Послуга *</label>
            {loadingServices ? (
              <div className="flex h-12 items-center justify-center">
                <LoaderCircle className="h-5 w-5 animate-spin text-zinc-400" />
              </div>
            ) : services.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Додайте послуги в розділі «Послуги»
              </p>
            ) : (
              <Select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.price} грн, {s.duration_minutes} хв
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Дата та час *</label>
            <Input
              type="datetime-local"
              value={bookingStart}
              onChange={(e) => setBookingStart(e.target.value)}
            />
            {selectedService && (
              <p className="text-xs text-zinc-400">
                Тривалість: {selectedService.duration_minutes} хв
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Примітки</label>
            <Textarea
              placeholder="Додаткова інформація"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            className="w-full"
            disabled={saving || services.length === 0}
            onClick={handleSubmit}
          >
            {saving ? "Збереження…" : "Створити запис"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
