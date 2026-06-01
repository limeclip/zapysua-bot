"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Service } from "@/types";

export function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ services: Service[] }>("/api/services");
      setServices(data.services);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setPrice("");
    setDuration("");
    setDescription("");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (service: Service) => {
    setEditingId(service.id);
    setName(service.name);
    setPrice(String(service.price));
    setDuration(String(service.duration_minutes));
    setDescription(service.description ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !duration) return;

    setSaving(true);
    try {
      if (editingId) {
        await apiFetch("/api/services", {
          method: "PATCH",
          body: JSON.stringify({
            id: editingId,
            name: name.trim(),
            price: parseInt(price, 10),
            duration_minutes: parseInt(duration, 10),
            description: description.trim() || null,
          }),
        });
      } else {
        await apiFetch("/api/services", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            price: parseInt(price, 10),
            duration_minutes: parseInt(duration, 10),
            description: description.trim() || null,
          }),
        });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Видалити цю послугу?")) return;

    try {
      await apiFetch(`/api/services?id=${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка видалення");
    }
  };

  if (loading) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">Завантаження…</p>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Послуги
        </h2>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Додати
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/50">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="space-y-3">
          <h3 className="font-medium">
            {editingId ? "Редагувати послугу" : "Нова послуга"}
          </h3>
          <Input
            placeholder="Назва"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Ціна (грн)"
              type="number"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input
              placeholder="Хвилини"
              type="number"
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Опис (необов'язково)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={resetForm}
            >
              Скасувати
            </Button>
            <Button
              className="flex-1"
              disabled={saving || !name.trim()}
              onClick={handleSave}
            >
              {saving ? "…" : "Зберегти"}
            </Button>
          </div>
        </Card>
      )}

      {services.length === 0 && !showForm ? (
        <Card>
          <p className="py-6 text-center text-sm text-zinc-500">
            Послуг поки немає. Додайте першу!
          </p>
          <Button className="mt-2 w-full" onClick={() => setShowForm(true)}>
            Додати послугу
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-col gap-3">
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">
                  {service.name}
                </p>
                <p className="text-sm text-zinc-500">
                  {service.price} грн · {service.duration_minutes} хв
                </p>
                {service.description && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {service.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(service)}
                >
                  Редагувати
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(service.id)}
                >
                  Видалити
                </Button>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
