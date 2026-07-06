"use client";

import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Card, Badge, Button, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/toast";
import { useAuth } from "@/components/auth";
import { getProfile, saveProfile, type MemberProfile } from "@/lib/store";
import { MEMBER_ROLE_TYPES, DEPARTMENTS, COMMITMENT_LEVELS, TENURE_OPTIONS } from "@/lib/mas";

// Read an image file and downscale it to a small square-ish data URL, so the
// avatar can be stored inline with the profile — no restricted storage bucket,
// no upload permissions, works for every user. Keeps it a few KB.
function imageToDataUrl(file: File, max = 320, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("no canvas")); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const SKILLS = ["Teaching", "Event Planning", "Fundraising", "Media & Design", "Youth Mentorship", "Data & Reporting", "Operations", "Tech & Web"];

// A page every member can open to see and complete their own profile — add a
// picture, and fill in (or fix) the role / department / commitment / tenure /
// skills, even if they skipped it during onboarding. Saved to their profile.
export default function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [roleType, setRoleType] = useState("");
  const [department, setDepartment] = useState("");
  const [commitment, setCommitment] = useState("");
  const [tenure, setTenure] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getProfile(user.email).then((p) => {
      if (!active) return;
      setName(p?.name || user.name || "");
      setAvatar(p?.avatar_url || "");
      setRoleType(p?.role_type || "");
      setDepartment(p?.department || "");
      setCommitment(p?.commitment || "");
      setTenure(p?.tenure || "");
      setSkills(p?.skills || []);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [user?.email]);

  async function onPicture(f: File | undefined) {
    if (!f || !user) return;
    if (!f.type.startsWith("image/")) { toast("Please choose an image file.", "error"); return; }
    setUploading(true);
    try {
      setAvatar(await imageToDataUrl(f));
      toast("Picture added — remember to Save.");
    } catch {
      toast("Couldn't read that image — try another one.", "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    const existing = await getProfile(user.email);
    const profile: MemberProfile = {
      email: user.email,
      name: name.trim() || user.name,
      role_type: roleType,
      department,
      commitment,
      tenure,
      skills,
      avatar_url: avatar,
      onboarded: existing?.onboarded ?? true,
    };
    const res = await saveProfile(profile);
    setSaving(false);
    toast(res.ok ? "Profile saved ✓" : `Couldn't save — ${res.error ?? "please try again"}`, res.ok ? "success" : "error");
  }

  if (!user) return null;
  const initials = (name || user.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]!.toUpperCase()).join("");

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle sub="Add your picture and keep your details up to date — this is what your team sees. You can fill this in anytime.">
        My Profile
      </SectionTitle>

      {!loaded ? (
        <div className="flex justify-center py-10"><Icons.Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <Card className="p-6">
          {/* picture + name */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Your picture" className="h-20 w-20 rounded-full object-cover ring-2 ring-accent/30" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/15 text-xl font-bold text-accent">{initials}</div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow hover:opacity-90"
                aria-label="Change picture"
              >
                {uploading ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPicture(e.target.files?.[0])} />
            </div>
            <div className="min-w-0 flex-1">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Your name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="modal-input" />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* fields */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">I serve as a…</span>
              <select value={roleType} onChange={(e) => setRoleType(e.target.value)} className="modal-input">
                <option value="">Select…</option>
                {MEMBER_ROLE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Department / Area of Focus</span>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="modal-input">
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Weekly commitment</span>
              <select value={commitment} onChange={(e) => setCommitment(e.target.value)} className="modal-input">
                <option value="">Select…</option>
                {COMMITMENT_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Time with the organization</span>
              <select value={tenure} onChange={(e) => setTenure(e.target.value)} className="modal-input">
                <option value="">Select…</option>
                {TENURE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
          </div>

          <p className="mt-5 mb-1.5 text-xs font-medium text-muted-foreground">Skills you bring</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${skills.includes(s) ? "bg-accent text-accent-foreground" : "border bg-card hover:bg-secondary"}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button size="md" onClick={save} disabled={saving}>
              {saving ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Check className="h-4 w-4" />} Save profile
            </Button>
            {(roleType || department) && <Badge tone="muted">{[roleType, department].filter(Boolean).join(" · ")}</Badge>}
          </div>
        </Card>
      )}
    </div>
  );
}
