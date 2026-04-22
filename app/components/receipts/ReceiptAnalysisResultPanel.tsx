import React from "react";
import { Card, Collapse, Empty, Space, Typography } from "antd";
import type { ReceiptAnalysisResult, ReceiptLineItem } from "@/types/receipt";

const { Paragraph, Title } = Typography;

type KeyValueRow = {
  label: string;
  value: string | null | undefined;
};

interface ReceiptAnalysisResultPanelProps {
  result: ReceiptAnalysisResult | null | undefined;
  loading?: boolean;
  emptyDescription?: string;
  showMetadata?: boolean;
  cardTitle?: string;
}

function renderSummary(rows: KeyValueRow[]) {
  const visibleRows = rows.filter((row) => row.value);
  if (visibleRows.length === 0) {
    return <Empty description="No structured receipt fields returned yet." />;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {visibleRows.map((row) => (
          <tr key={row.label}>
            <th
              scope="row"
              style={{ textAlign: "left", verticalAlign: "top", padding: "8px 12px 8px 0" }}
            >
              {row.label}
            </th>
            <td style={{ padding: "8px 0" }}>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderItemsTable(items: ReceiptLineItem[] | null | undefined) {
  if (!items || items.length === 0) {
    return <Empty description="No receipt line items returned yet." />;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Product</th>
            <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Quantity</th>
            <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Unit price</th>
            <th style={{ textAlign: "left", padding: "8px 12px 8px 0" }}>Total price</th>
            <th style={{ textAlign: "left", padding: "8px 0" }}>Product code</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.description ?? "item"}-${index}`}>
              <td style={{ padding: "8px 12px 8px 0" }}>{item.description ?? "—"}</td>
              <td style={{ padding: "8px 12px 8px 0" }}>{item.quantity ?? "—"}</td>
              <td style={{ padding: "8px 12px 8px 0" }}>{item.price ?? "—"}</td>
              <td style={{ padding: "8px 12px 8px 0" }}>{item.totalPrice ?? "—"}</td>
              <td style={{ padding: "8px 0" }}>{item.productCode ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReceiptAnalysisResultPanel({
  result,
  loading = false,
  emptyDescription = "No receipt analysis result yet.",
  showMetadata = false,
  cardTitle = "Receipt analysis result",
}: ReceiptAnalysisResultPanelProps) {
  if (loading) {
    return (
      <Card size="small" title={cardTitle}>
        <Paragraph style={{ marginBottom: 0 }}>Loading receipt analysis history...</Paragraph>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card size="small" title={cardTitle}>
        <Empty description={emptyDescription} />
      </Card>
    );
  }

  const summaryRows: KeyValueRow[] = [
    { label: "Status", value: result.status },
    { label: "Merchant / store", value: result.merchantName },
    { label: "Phone", value: result.merchantPhoneNumber },
    { label: "Address", value: result.merchantAddress },
    { label: "Transaction date", value: result.transactionDate },
    { label: "Transaction time", value: result.transactionTime },
    { label: "Receipt type", value: result.receiptType },
    { label: "Country / region", value: result.countryRegion },
    { label: "Currency", value: result.currencyCode },
    { label: "Subtotal", value: result.subtotal },
    { label: "Tax", value: result.tax },
    { label: "Tip", value: result.tip },
    { label: "Total", value: result.total },
  ];

  const metadataRows: KeyValueRow[] = [
    { label: "Analysis id", value: result.id ? String(result.id) : null },
    { label: "Requested by user id", value: result.requestedByUserId ? String(result.requestedByUserId) : null },
    { label: "Requested by username", value: result.requestedByUsername },
    { label: "Requested at", value: result.requestedAt ? new Date(result.requestedAt).toLocaleString() : null },
    { label: "Analyzed at", value: result.analyzedAt ? new Date(result.analyzedAt).toLocaleString() : null },
    { label: "Uploaded file name", value: result.uploadedImageFileName },
  ];

  return (
    <Card size="small" title={cardTitle}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {showMetadata ? (
          <div>
            <Title level={5}>Request metadata</Title>
            {renderSummary(metadataRows)}
          </div>
        ) : null}

        {result.uploadedImageDataUrl ? (
          <div>
            <Title level={5}>Uploaded receipt image</Title>
            <img
              src={result.uploadedImageDataUrl}
              alt={result.uploadedImageFileName ?? "Stored receipt image"}
              style={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain" }}
            />
          </div>
        ) : null}

        <div>
          <Title level={5}>Store and totals</Title>
          {renderSummary(summaryRows)}
        </div>

        <div>
          <Title level={5}>Line items</Title>
          {renderItemsTable(result.items)}
        </div>

        <div>
          <Title level={5}>OCR text</Title>
          {result.rawText ? (
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{result.rawText}</pre>
          ) : (
            <Empty description="No OCR text returned." />
          )}
        </div>

        <Collapse
          items={[
            {
              key: "receipt-fields",
              label: "All extracted receipt fields",
              children: (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {JSON.stringify(result.extractedFields ?? {}, null, 2)}
                </pre>
              ),
            },
            {
              key: "receipt-raw-result",
              label: "Raw Azure result payload",
              children: (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
                  {JSON.stringify(result.rawResult ?? {}, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      </Space>
    </Card>
  );
}
