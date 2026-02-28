import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register a clean font
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjQ.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjQ.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjQ.ttf', fontWeight: 700 },
  ],
});

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter', fontSize: 10, color: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottomWidth: 2, borderBottomColor: '#4F3B78', paddingBottom: 12 },
  logo: { fontSize: 18, fontWeight: 700, color: '#4F3B78' },
  headerRight: { textAlign: 'right' },
  headerPeriod: { fontSize: 11, fontWeight: 600 },
  headerDate: { fontSize: 8, color: '#666', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8, marginTop: 20, color: '#4F3B78' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#f8f7fc', borderRadius: 6, padding: 12, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: 700 },
  summaryLabel: { fontSize: 8, color: '#666', marginTop: 2 },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#4F3B78', borderRadius: 4, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeaderCell: { color: '#fff', fontWeight: 600, fontSize: 9 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5' },
  tableCell: { fontSize: 9 },
  col1: { flex: 2 },
  col2: { flex: 1, textAlign: 'right' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  incidentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, backgroundColor: '#fff5f5', borderRadius: 4, marginBottom: 4 },
  incidentLeft: {},
  incidentService: { fontWeight: 600, fontSize: 9 },
  incidentDate: { fontSize: 8, color: '#666', marginTop: 1 },
  incidentRight: { alignItems: 'flex-end' },
  incidentCause: { fontSize: 8, color: '#666', maxWidth: 200 },
  incidentDuration: { fontSize: 8, fontWeight: 600, color: '#dc2626', marginTop: 1 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999', borderTopWidth: 0.5, borderTopColor: '#e5e5e5', paddingTop: 8 },
  uptimeGood: { color: '#16a34a' },
  uptimeWarn: { color: '#d97706' },
  uptimeBad: { color: '#dc2626' },
  noData: { fontSize: 9, color: '#999', textAlign: 'center', paddingVertical: 16 },
});

interface ServiceMetric {
  name: string;
  icon: string;
  uptime: number | null;
  avgResponse: number | null;
  incidents: { start: string; end: string; duration: number; cause: string }[];
}

interface SlaRow {
  provider: string;
  promised: number;
  real: number | null;
  delta: number | null;
}

interface ReportPDFProps {
  periodLabel: string;
  createdAt: string;
  globalUptime: number;
  totalIncidents: number;
  servicesCount: number;
  serviceMetrics: ServiceMetric[];
  allIncidents: { serviceName: string; start: string; duration: number; cause: string }[];
  slaRows?: SlaRow[];
  includeSla?: boolean;
}

function uptimeStyle(v: number | null) {
  if (v === null) return {};
  if (v >= 99.9) return s.uptimeGood;
  if (v >= 99) return s.uptimeWarn;
  return s.uptimeBad;
}

function fmtDuration(min: number) {
  if (min < 60) return `${min}min`;
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}min` : ''}`;
}

export default function ReportPDF({
  periodLabel,
  createdAt,
  globalUptime,
  totalIncidents,
  servicesCount,
  serviceMetrics,
  allIncidents,
  slaRows = [],
  includeSla = false,
}: ReportPDFProps) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.logo}>🦆 MoniDuck</Text>
          <View style={s.headerRight}>
            <Text style={s.headerPeriod}>{periodLabel}</Text>
            <Text style={s.headerDate}>
              Generated {format(new Date(createdAt), 'PPPp')}
            </Text>
          </View>
        </View>

        {/* Summary */}
        <Text style={s.sectionTitle}>Summary</Text>
        <View style={s.summaryRow}>
          <View style={s.summaryCard}>
            <Text style={[s.summaryValue, uptimeStyle(globalUptime)]}>{globalUptime}%</Text>
            <Text style={s.summaryLabel}>Global Uptime</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{totalIncidents}</Text>
            <Text style={s.summaryLabel}>Incidents</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryValue}>{servicesCount}</Text>
            <Text style={s.summaryLabel}>Services</Text>
          </View>
        </View>

        {/* Services Uptime Table */}
        <Text style={s.sectionTitle}>Services Uptime</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderCell, s.col1]}>Service</Text>
            <Text style={[s.tableHeaderCell, s.col2]}>Uptime</Text>
            <Text style={[s.tableHeaderCell, s.col3]}>Incidents</Text>
            <Text style={[s.tableHeaderCell, s.col4]}>Avg Response</Text>
          </View>
          {serviceMetrics.length === 0 ? (
            <Text style={s.noData}>No services in scope</Text>
          ) : (
            serviceMetrics.map((m, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={[s.tableCell, s.col1]}>{m.icon} {m.name}</Text>
                <Text style={[s.tableCell, s.col2, uptimeStyle(m.uptime)]}>
                  {m.uptime !== null ? `${m.uptime}%` : 'N/A'}
                </Text>
                <Text style={[s.tableCell, s.col3]}>
                  {m.incidents.length > 0 ? String(m.incidents.length) : '✓'}
                </Text>
                <Text style={[s.tableCell, s.col4]}>
                  {m.avgResponse !== null ? `${m.avgResponse}ms` : '—'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Incidents Log */}
        <Text style={s.sectionTitle}>Incidents Log</Text>
        {allIncidents.length === 0 ? (
          <Text style={s.noData}>No incidents during this period 🎉</Text>
        ) : (
          allIncidents.map((inc, i) => (
            <View key={i} style={s.incidentRow}>
              <View style={s.incidentLeft}>
                <Text style={s.incidentService}>{inc.serviceName}</Text>
                <Text style={s.incidentDate}>{format(new Date(inc.start), 'PPp')}</Text>
              </View>
              <View style={s.incidentRight}>
                <Text style={s.incidentCause}>{inc.cause}</Text>
                <Text style={s.incidentDuration}>{fmtDuration(inc.duration)}</Text>
              </View>
            </View>
          ))
        )}

        {/* SLA Section */}
        {includeSla && slaRows.length > 0 && (
          <>
            <Text style={s.sectionTitle}>SaaS Providers SLA</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableHeaderCell, s.col1]}>Provider</Text>
                <Text style={[s.tableHeaderCell, s.col2]}>Promised</Text>
                <Text style={[s.tableHeaderCell, s.col3]}>Measured</Text>
                <Text style={[s.tableHeaderCell, s.col4]}>Delta</Text>
              </View>
              {slaRows.map((row, i) => (
                <View key={i} style={s.tableRow}>
                  <Text style={[s.tableCell, s.col1]}>{row.provider}</Text>
                  <Text style={[s.tableCell, s.col2]}>{row.promised}%</Text>
                  <Text style={[s.tableCell, s.col3, uptimeStyle(row.real)]}>
                    {row.real !== null ? `${row.real}%` : 'N/A'}
                  </Text>
                  <Text style={[s.tableCell, s.col4, row.delta !== null ? (row.delta >= 0 ? s.uptimeGood : s.uptimeBad) : {}]}>
                    {row.delta !== null ? `${row.delta >= 0 ? '+' : ''}${row.delta}%` : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Footer */}
        <Text style={s.footer}>Generated by MoniDuck · moniduck.io</Text>
      </Page>
    </Document>
  );
}
