import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  initConnection, getSubscriptions, requestSubscription,
  finishTransaction, purchaseErrorListener, purchaseUpdatedListener,
  clearTransactionIOS,
} from "react-native-iap";
import {
  PRODUCTS, ALL_PRODUCTS, PRO_PRODUCTS, ELITE_PRODUCTS,
  verifyAndActivate,
} from "../lib/subscription";
import { getSessionSafe } from "../lib/supabase";

const PLANS = [
  {
    key: "free",
    icon: "🌱",
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    badge: null,
    badgeColor: null,
    features: [
      { text: "3 interviews per month", included: true },
      { text: "Basic score report",     included: true },
      { text: "Study Hub access",       included: true },
      { text: "Skill radar chart",      included: false },
      { text: "Progress trends",        included: false },
    ],
    monthlyId: null,
    yearlyId:  null,
    cta: "Current Plan",
    ctaDisabled: true,
  },
  {
    key: "pro",
    icon: "🚀",
    name: "Pro",
    monthlyPrice: 9.99,
    yearlyPrice:  7.99,
    badge: "⭐ Most Popular",
    badgeColor: "#3b82f6",
    features: [
      { text: "Unlimited interviews",          included: true },
      { text: "Full scoring breakdown",        included: true },
      { text: "Skill radar chart",             included: true },
      { text: "Readiness progress graph",      included: true },
      { text: "Daily streak & Study Hub",      included: true },
      { text: "Quick 5-min practice mode",     included: true },
    ],
    monthlyId: PRODUCTS.PRO_MONTHLY,
    yearlyId:  PRODUCTS.PRO_YEARLY,
    trialDays: 3,
    cta: "Start Pro",
    ctaColor: "#3b82f6",
  },
  {
    key: "elite",
    icon: "💎",
    name: "Elite",
    monthlyPrice: 19.99,
    yearlyPrice:  15.99,
    badge: "👑 Elite",
    badgeColor: "#7c3aed",
    features: [
      { text: "Everything in Pro",                        included: true },
      { text: "Company modes (Amazon, Google…)",          included: true },
      { text: "Downloadable PDF report",                  included: true },
      { text: "Priority AI responses",                    included: true },
      { text: "Early access to new features",             included: true },
    ],
    monthlyId: PRODUCTS.ELITE_MONTHLY,
    yearlyId:  PRODUCTS.ELITE_YEARLY,
    cta: "Get Elite",
    ctaColor: "#7c3aed",
  },
];

export default function PlansScreen({ navigation, route }) {
  const currentTier  = route?.params?.currentTier ?? "free";
  const [yearly,     setYearly]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [purchasing, setPurchasing] = useState(null); // productId being purchased
  const [storeReady, setStoreReady] = useState(false);

  // ── Connect to Google Play Billing on mount ───────────────────────────────
  useEffect(() => {
    let purchaseUpdate;
    let purchaseError;

    async function setup() {
      try {
        await initConnection();
        setStoreReady(true);

        purchaseUpdate = purchaseUpdatedListener(async (purchase) => {
          const token = purchase.purchaseToken;
          const productId = purchase.productId;
          if (!token) return;
          try {
            await verifyAndActivate(token, productId);
            await finishTransaction({ purchase, isConsumable: false });
            setPurchasing(null);
            Alert.alert(
              "🎉 Subscription Active!",
              "Your plan has been upgraded. Enjoy your new features!",
              [{ text: "Let's go!", onPress: () => navigation.goBack() }]
            );
          } catch (e) {
            setPurchasing(null);
            Alert.alert("Verification Failed", e?.message || "Please contact support.");
          }
        });

        purchaseError = purchaseErrorListener((err) => {
          setPurchasing(null);
          if (err?.code !== "E_USER_CANCELLED") {
            Alert.alert("Purchase Failed", err?.message || "Something went wrong. Please try again.");
          }
        });
      } catch (e) {
        console.error("IAP init error:", e?.message);
      } finally {
        setLoading(false);
      }
    }

    setup();
    return () => {
      purchaseUpdate?.remove();
      purchaseError?.remove();
    };
  }, []);

  // ── Trigger a purchase ────────────────────────────────────────────────────
  async function handlePurchase(plan) {
    const productId = yearly ? plan.yearlyId : plan.monthlyId;
    if (!productId) return;

    setPurchasing(productId);
    try {
      await requestSubscription({ sku: productId });
      // Result comes via purchaseUpdatedListener
    } catch (e) {
      setPurchasing(null);
      if (e?.code !== "E_USER_CANCELLED") {
        Alert.alert("Purchase Error", e?.message || "Could not start purchase.");
      }
    }
  }

  const annualSavings = (monthly, yearly) =>
    Math.round((monthly - yearly) * 12);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Connecting to store…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.subtitle}>
            Practice with AI, get scored, and land the job.
          </Text>

          {/* Billing toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, !yearly && styles.toggleBtnActive]}
              onPress={() => setYearly(false)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, !yearly && styles.toggleLabelActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, yearly && styles.toggleBtnActive]}
              onPress={() => setYearly(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleLabel, yearly && styles.toggleLabelActive]}>
                Yearly  <Text style={styles.saveBadge}>SAVE 20%</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Plan cards */}
          {PLANS.map((plan) => {
            const isCurrent  = currentTier === plan.key;
            const isPro      = plan.key === "pro";
            const isElite    = plan.key === "elite";
            const price      = yearly ? plan.yearlyPrice : plan.monthlyPrice;
            const productId  = yearly ? plan.yearlyId    : plan.monthlyId;
            const isBuying   = purchasing === productId;

            return (
              <View
                key={plan.key}
                style={[
                  styles.card,
                  isPro   && styles.cardPro,
                  isElite && styles.cardElite,
                ]}
              >
                {plan.badge && (
                  <View style={[styles.badge, { backgroundColor: plan.badgeColor }]}>
                    <Text style={styles.badgeText}>{plan.badge}</Text>
                  </View>
                )}

                <Text style={styles.planIcon}>{plan.icon}</Text>
                <Text style={[styles.planName, isPro && styles.proText]}>
                  {plan.name.toUpperCase()}
                </Text>

                <View style={styles.priceRow}>
                  {price === 0 ? (
                    <Text style={[styles.priceAmount, isPro && styles.proText]}>Free</Text>
                  ) : (
                    <>
                      <Text style={[styles.priceCurrency, isPro && styles.proText, isElite && { color: "#7c3aed" }]}>$</Text>
                      <Text style={[styles.priceAmount, isPro && styles.proText, isElite && { color: "#7c3aed" }]}>
                        {price.toFixed(2)}
                      </Text>
                      <Text style={[styles.pricePeriod, isPro && { color: "rgba(255,255,255,0.55)" }]}>/mo</Text>
                    </>
                  )}
                </View>

                {yearly && price > 0 && (
                  <Text style={[styles.annualNote, isPro && { color: "rgba(255,255,255,0.55)" }]}>
                    Billed ${(price * 12).toFixed(0)}/year — save ${annualSavings(plan.monthlyPrice, plan.yearlyPrice)}/year
                  </Text>
                )}

                {plan.trialDays && !isCurrent && (
                  <Text style={[styles.trialNote, isPro && { color: "#60d394" }]}>
                    {plan.trialDays}-day free trial
                  </Text>
                )}

                <View style={[styles.divider, isPro && { backgroundColor: "rgba(255,255,255,0.12)" }]} />

                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={[
                      styles.checkCircle,
                      f.included
                        ? (isPro ? styles.checkPro : isElite ? styles.checkElite : styles.checkFree)
                        : styles.checkNo,
                    ]}>
                      <Text style={[
                        styles.checkMark,
                        f.included
                          ? (isPro ? { color: "#60d394" } : isElite ? { color: "#7c3aed" } : { color: "#16a34a" })
                          : { color: "#ccc" },
                      ]}>
                        {f.included ? "✓" : "✕"}
                      </Text>
                    </View>
                    <Text style={[
                      styles.featureText,
                      isPro && styles.proText,
                      !f.included && styles.featureDim,
                      isPro && !f.included && { color: "rgba(255,255,255,0.35)" },
                    ]}>
                      {f.text}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity
                  style={[
                    styles.ctaBtn,
                    plan.ctaColor && { backgroundColor: plan.ctaColor },
                    !plan.ctaColor && styles.ctaBtnFree,
                    (isCurrent || plan.ctaDisabled || isBuying) && styles.ctaBtnDisabled,
                  ]}
                  onPress={() => !isCurrent && !plan.ctaDisabled && handlePurchase(plan)}
                  disabled={isCurrent || plan.ctaDisabled || isBuying || !storeReady}
                  activeOpacity={0.85}
                >
                  {isBuying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={[styles.ctaBtnText, !plan.ctaColor && { color: "#555" }]}>
                      {isCurrent ? "Current Plan" : plan.cta}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.footer}>
            Cancel anytime. Subscriptions managed via Google Play.{"\n"}
            Prices shown in USD. Local prices may vary.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f6" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0",
  },
  back:        { fontSize: 15, color: "#111", width: 60 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111" },

  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#888" },

  scroll:   { padding: 20, paddingBottom: 48 },
  subtitle: { fontSize: 14, color: "#888", textAlign: "center", marginBottom: 20 },

  // Billing toggle
  toggleRow: {
    flexDirection: "row", backgroundColor: "#e8e8ec",
    borderRadius: 12, padding: 3, marginBottom: 20,
  },
  toggleBtn:       { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleLabel:       { fontSize: 13, fontWeight: "600", color: "#888" },
  toggleLabelActive: { color: "#111" },
  saveBadge: { fontSize: 10, fontWeight: "800", color: "#16a34a" },

  // Cards
  card: {
    backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ececec",
    padding: 20, marginBottom: 14,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8,
    elevation: 2,
  },
  cardPro:   { backgroundColor: "#111", borderColor: "transparent", elevation: 6 },
  cardElite: { borderColor: "#7c3aed", borderWidth: 2 },

  badge: {
    alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, marginBottom: 12,
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  planIcon: { fontSize: 28, marginBottom: 6 },
  planName: { fontSize: 12, fontWeight: "700", letterSpacing: 1, color: "#888", marginBottom: 8 },
  proText:  { color: "#fff" },

  priceRow:     { flexDirection: "row", alignItems: "flex-end", gap: 1, marginBottom: 2 },
  priceCurrency:{ fontSize: 18, fontWeight: "700", color: "#111", paddingBottom: 7 },
  priceAmount:  { fontSize: 44, fontWeight: "800", letterSpacing: -2, color: "#111" },
  pricePeriod:  { fontSize: 13, color: "#888", paddingBottom: 9, marginLeft: 2 },

  annualNote: { fontSize: 11, color: "#888", marginTop: 2, marginBottom: 4 },
  trialNote:  { fontSize: 12, color: "#16a34a", fontWeight: "600", marginTop: 4, marginBottom: 2 },

  divider: { height: 1, backgroundColor: "#f0f0f0", marginVertical: 16 },

  featureRow:  { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  checkCircle: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  checkFree:   { backgroundColor: "#e8f5e9" },
  checkPro:    { backgroundColor: "rgba(96,211,148,0.15)" },
  checkElite:  { backgroundColor: "rgba(124,58,237,0.1)" },
  checkNo:     { backgroundColor: "#f3f4f6" },
  checkMark:   { fontSize: 10, fontWeight: "800" },
  featureText: { flex: 1, fontSize: 13.5, color: "#111", lineHeight: 20 },
  featureDim:  { color: "#bbb" },

  ctaBtn:         { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 18 },
  ctaBtnFree:     { backgroundColor: "#e8e8ec" },
  ctaBtnDisabled: { opacity: 0.55 },
  ctaBtnText:     { fontSize: 15, fontWeight: "700", color: "#fff" },

  footer: { fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 8, lineHeight: 18 },
});
