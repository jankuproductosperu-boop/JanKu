"use client";
import { useState, useEffect } from "react";
import type { ProductAdmin, Category, Promotion } from "@/types";
import type { BannerConPosicion } from "@/app/(admin)/admin/_components/BannersTab";

export function useAdminData() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [banners, setBanners] = useState<BannerConPosicion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const loadProducts = async () => {
    try { const res = await fetch("/api/admin/products"); const d = await res.json(); setProducts(Array.isArray(d) ? d : []); }
    catch { setProducts([]); }
  };
  const loadBanners = async () => {
    try { const res = await fetch("/api/admin/banners"); const d = await res.json(); setBanners(Array.isArray(d) ? d : []); }
    catch { setBanners([]); }
  };
  const loadCategories = async () => {
    try { const res = await fetch("/api/categories"); const d = await res.json(); setCategories(Array.isArray(d) ? d : []); }
    catch { setCategories([]); }
  };
  const loadPromotions = async () => {
    try { const res = await fetch("/api/admin/promotions"); const d = await res.json(); setPromotions(Array.isArray(d) ? d : []); }
    catch { setPromotions([]); }
  };

  useEffect(() => {
    const cargarTodo = async () => {
      await Promise.all([loadProducts(), loadBanners(), loadCategories(), loadPromotions()]);
    };
    cargarTodo();
  }, []);

  return { products, banners, categories, promotions, loadProducts, loadBanners, loadCategories, loadPromotions };
}
