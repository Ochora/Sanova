import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, formatDate, isValidDateKey, monthKey, monthLabel, toDateKey } from '../lib/dates';
import { formatUGX } from '../lib/id';
import { EXPENSE_CAT, EXPENSE_CATEGORIES } from '../lib/records';
import { useStore } from '../lib/store';
import type { ExpenseCategory } from '../lib/types';
import { Button, Card, Chip, ChipRow, Empty, Field, Notice, Screen, SectionTitle } from '../ui/components';
import { MemberPicker } from '../ui/MemberPicker';
import { colors, space, type } from '../ui/theme';

function lastMonths(n: number): string[] {
  const d = new Date();
  d.setDate(1);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(toDateKey(x).slice(0, 7));
  }
  return out;
}

export default function Expenses() {
  const { data, self, saveExpense, removeExpense } = useStore();
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('consultation');
  const [date, setDate] = useState(toDateKey());
  const [note, setNote] = useState('');
  const [memberId, setMemberId] = useState<string | undefined>(self?.id);

  const thisMonth = toDateKey().slice(0, 7);
  const months = lastMonths(6);
  const byMonth = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of data.expenses) m[monthKey(e.date)] = (m[monthKey(e.date)] ?? 0) + e.amount;
    return m;
  }, [data.expenses]);
  const max = Math.max(1, ...months.map((k) => byMonth[k] ?? 0));
  const yearKey = thisMonth.slice(0, 4);
  const yearTotal = data.expenses.filter((e) => e.date.startsWith(yearKey)).reduce((s, e) => s + e.amount, 0);
  const monthExpenses = data.expenses.filter((e) => monthKey(e.date) === thisMonth);
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ c, total: monthExpenses.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);

  const insight = useMemo(() => {
    const yearCats = EXPENSE_CATEGORIES.map((c) => ({
      c,
      total: data.expenses.filter((e) => e.date.startsWith(yearKey) && e.category === c.id).reduce((s, e) => s + e.amount, 0),
    })).sort((a, b) => b.total - a.total);
    const top = yearCats[0];
    if (!top || top.total === 0 || yearTotal === 0 || data.expenses.length < 3) return null;
    const pct = Math.round((top.total / yearTotal) * 100);
    const peak = Object.entries(byMonth).sort((a, b) => b[1] - a[1])[0];
    let s = `${top.c.label}: ${pct}% of your health spending this year.`;
    if (top.c.id === 'transport') s += ' A facility closer to home, or a CHW/VHT visit for minor issues, could cut this.';
    if (top.c.id === 'admission' || top.c.id === 'consultation') s += ' Health insurance or a community health scheme could cover part of this.';
    if (peak && Object.keys(byMonth).length >= 3) s += ` Your highest month was ${monthLabel(`${peak[0]}-01`)}.`;
    return s;
  }, [data.expenses, byMonth, yearKey, yearTotal]);

  const add = () => {
    const n = parseInt(amount.replace(/[^\d]/g, ''), 10);
    if (!n) return Alert.alert('Amount', 'Enter the amount in UGX.');
    if (!isValidDateKey(date)) return Alert.alert('Date', 'Use the format YYYY-MM-DD.');
    saveExpense({ memberId: memberId ?? self?.id ?? '', amount: n, category, date, note: note.trim() || undefined });
    setAmount('');
    setNote('');
    setAdding(false);
  };

  const recent = [...data.expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);

  return (
    <Screen>
      <Card>
        <Text style={type.label}>This month</Text>
        <Text style={[type.h1, { marginTop: 4 }]}>{formatUGX(monthTotal)}</Text>
        <Text style={type.small}>
          {formatUGX(yearTotal)} so far in {yearKey}
        </Text>
        <View style={styles.chart}>
          {months.map((k) => {
            const v = byMonth[k] ?? 0;
            return (
              <View key={k} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <View style={styles.track}>
                  <View style={{ height: `${(v / max) * 100}%`, backgroundColor: k === thisMonth ? colors.primary : colors.primarySoft, borderRadius: 6 }} />
                </View>
                <Text style={{ fontSize: 11, color: colors.faint }}>{monthLabel(`${k}-01`).slice(0, 3)}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      {insight && (
        <Notice tone="info" icon="bulb">
          {insight}
        </Notice>
      )}

      {adding ? (
        <Card>
          <MemberPicker value={memberId} onChange={(v) => v && setMemberId(v)} />
          <Field label="Amount (UGX)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="e.g. 25000" autoFocus />
          <ChipRow>
            {EXPENSE_CATEGORIES.map((c) => (
              <Chip key={c.id} label={c.label} selected={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </ChipRow>
          <View style={{ height: space(4) }} />
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: space(2) }}>
            <Chip label="Today" selected={date === toDateKey()} onPress={() => setDate(toDateKey())} />
            <Chip label="Yesterday" selected={date === addDays(toDateKey(), -1)} onPress={() => setDate(addDays(toDateKey(), -1))} />
          </View>
          <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
          <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. Malaria test at Kisenyi HC IV" />
          <View style={{ flexDirection: 'row', gap: space(3) }}>
            <Button title="Cancel" variant="secondary" onPress={() => setAdding(false)} style={{ flex: 1 }} />
            <Button title="Save" icon="checkmark" onPress={add} style={{ flex: 2 }} />
          </View>
        </Card>
      ) : (
        <Button title="Log a health expense" icon="add" onPress={() => setAdding(true)} />
      )}

      {byCat.length > 0 && (
        <>
          <SectionTitle>{monthLabel(`${thisMonth}-01`)} by category</SectionTitle>
          <Card>
            {byCat.map(({ c, total }) => (
              <View key={c.id} style={{ marginBottom: space(3) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={type.body}>{c.label}</Text>
                  <Text style={[type.body, { fontWeight: '700' }]}>{formatUGX(total)}</Text>
                </View>
                <View style={styles.hbar}>
                  <View style={{ width: `${(total / monthTotal) * 100}%`, height: '100%', backgroundColor: c.color, borderRadius: 4 }} />
                </View>
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionTitle>Recent</SectionTitle>
      {recent.length === 0 ? (
        <Empty icon="wallet" title="No expenses yet" body="Log consultation fees, lab tests, medicines and transport to see where your family's health money goes." />
      ) : (
        <Card style={{ padding: 0 }}>
          {recent.map((e, i) => {
            const c = EXPENSE_CAT[e.category];
            const owner = data.members.find((m) => m.id === e.memberId);
            return (
              <Pressable
                key={e.id}
                onLongPress={() =>
                  Alert.alert('Delete expense?', `${formatUGX(e.amount)} · ${c.label}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => removeExpense(e.id) },
                  ])
                }
                style={[styles.item, i > 0 && styles.border]}
              >
                <View style={[styles.icon, { backgroundColor: c.color + '1A' }]}>
                  <Ionicons name={c.icon as 'bed'} size={18} color={c.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.body, { fontWeight: '600' }]}>{e.note || c.label}</Text>
                  <Text style={type.small}>
                    {formatDate(e.date)} · {c.label}
                    {owner && owner.relationship !== 'self' ? ` · ${owner.name.split(' ')[0]}` : ''}
                  </Text>
                </View>
                <Text style={[type.body, { fontWeight: '700' }]}>{formatUGX(e.amount)}</Text>
              </Pressable>
            );
          })}
        </Card>
      )}
      {recent.length > 0 && <Text style={type.small}>Press and hold an expense to delete it.</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: 8, marginTop: space(4), alignItems: 'flex-end' },
  track: { width: '100%', height: 80, justifyContent: 'flex-end' },
  hbar: { height: 8, backgroundColor: colors.bg, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space(4) },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
