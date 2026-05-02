"use client";

import React, { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Image,
  Progress,
  Row,
  Space,
  Tag,
  Typography,
  Upload,
  theme as antdTheme,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  InboxOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useApi } from "@/hooks/useApi";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import useSessionStorage from "@/hooks/useSessionStorage";
import type { ReceiptAnalysisResult, ReceiptUploadSession } from "@/types/receipt";

const { Title, Paragraph, Text } = Typography;

const MAX_RECEIPT_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_RECEIPT_TYPES = new Set(["image/jpeg", "image/png"]);
const baseCardStyle = {
  background: "#ffffff",
  borderColor: "#d9e2cf",
};
const sectionCardStyle = {
  ...baseCardStyle,
  borderRadius: 24,
  height: "100%",
};
const sectionCardStyles = {
  header: {
    background: "#ffffff",
    borderBottomColor: "#e5ecda",
    paddingInline: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  body: {
    background: "#ffffff",
    padding: 24,
  },
};
const stepCardStyle = {
  ...baseCardStyle,
  borderRadius: 20,
  height: "100%",
};
const stepCardStyles = {
  body: {
    background: "#ffffff",
  },
};

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function isSupportedReceiptImage(file: File): boolean {
  return ACCEPTED_RECEIPT_TYPES.has(file.type);
}

function getReceiptUploadErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Receipt upload failed. Please try another image.";
  }

  if (error.message.includes("Failed to fetch")) {
    return "Could not reach the backend. Please make sure the server is running on http://localhost:8080, then try again.";
  }

  if (error.message.includes("413")) {
    return "The receipt image is too large. Please upload a JPG or PNG up to 5 MB.";
  }

  return error.message;
}

function PantryReceiptUploadPageContent() {
  useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const api = useApi();
  const { set: setReceiptUploadSession } = useSessionStorage<ReceiptUploadSession | null>(
    "receiptUploadSession",
    null,
  );

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [receiptResult, setReceiptResult] = useState<ReceiptAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pantryTarget = useMemo<PantryTarget | null>(() => {
    const householdId = Number(searchParams.get("householdId"));
    if (!Number.isFinite(householdId) || householdId <= 0) {
      return null;
    }

    return {
      householdId,
      householdName: searchParams.get("householdName") ?? undefined,
    };
  }, [searchParams]);

  const clearSelection = () => {
    setSelectedFile(null);
    setFileList([]);
    setPreviewUrl(null);
    setUploadProgress(0);
    setReceiptResult(null);
    setErrorMessage(null);
  };

  const validateFile = (file: File): string | null => {
    if (!isSupportedReceiptImage(file)) {
      return "Please upload a JPG or PNG receipt image.";
    }
    if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
      return "Receipt image must not exceed 5 MB.";
    }
    return null;
  };

  const updateSelectedFile = (file?: File) => {
    if (!file) {
      clearSelection();
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      clearSelection();
      setErrorMessage(validationError);
      return;
    }

    const uploadFile: UploadFile = {
      uid: `${Date.now()}`,
      name: file.name,
      status: "done",
    };

    setSelectedFile(file);
    setFileList([uploadFile]);
    setPreviewUrl(URL.createObjectURL(file));
    setReceiptResult(null);
    setUploadProgress(100);
    setErrorMessage(null);
  };

  const uploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: ".jpg,.jpeg,.png,image/jpeg,image/png",
    fileList,
    beforeUpload: (file) => {
      updateSelectedFile(file);
      return false;
    },
    onRemove: () => {
      clearSelection();
    },
  };

  const handleBackToPantry = () => {
    if (!pantryTarget) {
      router.push("/households");
      return;
    }

    router.push(
      `/households/${pantryTarget.householdId}?name=${encodeURIComponent(
        pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`,
      )}`,
    );
  };

  const handleUploadReceipt = async () => {
    if (!pantryTarget) {
      setErrorMessage("A valid household target is required before uploading a receipt.");
      return;
    }
    if (!selectedFile) {
      setErrorMessage("Please select a JPG or PNG receipt image first.");
      return;
    }

    setIsUploading(true);
    setReceiptResult(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const result = await api.postFormData<ReceiptAnalysisResult>(
        `/households/${pantryTarget.householdId}/receipt/upload`,
        formData,
      );

      const uploadSession: ReceiptUploadSession = {
        householdId: pantryTarget.householdId,
        householdName: pantryTarget.householdName,
        uploadedAt: new Date().toISOString(),
        result,
      };

      setReceiptResult(result);
      setReceiptUploadSession(uploadSession);
      setUploadProgress(100);
    } catch (error) {
      setErrorMessage(getReceiptUploadErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  };

  const extractedItemCount = receiptResult?.items?.length ?? 0;

  return (
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorText: "#182418",
          colorTextSecondary: "#566556",
          colorBgBase: "#ffffff",
        },
      }}
    >
      <div style={{ minHeight: "100vh", background: "#f4f6ee", padding: 24 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <Card
            style={{
              borderRadius: 24,
              borderColor: "#d9e2cf",
              background: "#ffffff",
              boxShadow: "0 8px 24px rgba(24, 36, 24, 0.06)",
            }}
            styles={{ body: { background: "#ffffff", padding: 32 } }}
          >
            <Space orientation="vertical" size="large" style={{ width: "100%", display: "flex" }}>
              <Space
                style={{
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 16,
                }}
              >
                <div>
                  <Tag color="green" style={{ marginBottom: 12, borderRadius: 999, paddingInline: 12, fontWeight: 600 }}>
                    Receipt upload
                  </Tag>
                  <Title level={1} style={{ margin: 0, color: "#18351f", fontSize: 48, lineHeight: 1.05 }}>
                    Upload receipt photo
                  </Title>
                  <Paragraph style={{ marginTop: 12, marginBottom: 0, maxWidth: 760, fontSize: 20, lineHeight: 1.55, color: "#5f6e60" }}>
                    Choose a clear JPG or PNG receipt image, upload it for OCR
                    parsing, and prepare extracted items for the review flow.
                  </Paragraph>
                  {pantryTarget ? (
                    <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                      Pantry target:{" "}
                      <strong>
                        {pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}
                      </strong>
                    </Paragraph>
                  ) : (
                    <Paragraph style={{ marginTop: 12, marginBottom: 0, color: "#a15c15" }}>
                      No valid household target was provided.
                    </Paragraph>
                  )}
                </div>

                <Button size="large" icon={<ArrowLeftOutlined />} onClick={handleBackToPantry}>
                  Back to pantry
                </Button>
              </Space>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Card size="small" style={stepCardStyle} styles={stepCardStyles}>
                    <Space orientation="vertical" size={8}>
                      <Text style={{ color: "#1f7a3f", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        1. Select image
                      </Text>
                      <Title level={4} style={{ margin: 0, color: "#18351f" }}>JPG or PNG</Title>
                      <Text type="secondary">Maximum file size is 5 MB.</Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card size="small" style={stepCardStyle} styles={stepCardStyles}>
                    <Space orientation="vertical" size={8}>
                      <Text style={{ color: "#1f7a3f", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        2. Upload
                      </Text>
                      <Title level={4} style={{ margin: 0, color: "#18351f" }}>OCR parsing</Title>
                      <Text type="secondary">The backend extracts receipt line items.</Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} md={8}>
                  <Card size="small" style={stepCardStyle} styles={stepCardStyles}>
                    <Space orientation="vertical" size={8}>
                      <Text style={{ color: "#1f7a3f", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        3. Review next
                      </Text>
                      <Title level={4} style={{ margin: 0, color: "#18351f" }}>Review items next</Title>
                      <Text type="secondary">Check extracted items before adding them to pantry.</Text>
                    </Space>
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                  <Card
                    title={<span style={{ fontSize: 24, fontWeight: 700, color: "#1f2d1f" }}>Choose receipt image</span>}
                    style={sectionCardStyle}
                    styles={sectionCardStyles}
                  >
                    <Space orientation="vertical" size="large" style={{ width: "100%", display: "flex" }}>
                      <Space wrap size="middle">
                        <Upload {...uploadProps}>
                          <Button size="large" icon={<UploadOutlined />}>Choose receipt file</Button>
                        </Upload>

                      </Space>

                      <Text type="secondary">
                        A full, well-lit receipt photo improves OCR accuracy.
                        Supported formats: JPG and PNG, up to 5 MB.
                      </Text>

                      {selectedFile ? (
                        <Alert
                          type="success"
                          showIcon
                          title="Receipt image selected"
                          description={`${selectedFile.name} · ${formatBytes(selectedFile.size)}`}
                        />
                      ) : (
                        <Alert
                          type="info"
                          showIcon
                          title="No receipt selected yet"
                          description="Choose a receipt image to prepare it for OCR analysis."
                        />
                      )}
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} lg={10}>
                  <Card
                    title={<span style={{ fontSize: 24, fontWeight: 700, color: "#1f2d1f" }}>Preview and status</span>}
                    style={sectionCardStyle}
                    styles={sectionCardStyles}
                  >
                    <Space orientation="vertical" size="middle" style={{ width: "100%", display: "flex" }}>
                      {previewUrl ? (
                        <div style={{ background: "#f7f9f1", border: "1px solid #e1e8d6", borderRadius: 20, padding: 16, textAlign: "center" }}>
                          <Image src={previewUrl} alt="Selected receipt image" width={320} style={{ objectFit: "contain", borderRadius: 12 }} />
                        </div>
                      ) : (
                        <Alert
                          type="warning"
                          showIcon
                          icon={<WarningOutlined />}
                          title="No image selected"
                          description="The receipt preview will appear here."
                        />
                      )}

                      <Progress
                        percent={uploadProgress}
                        status={errorMessage ? "exception" : selectedFile ? "success" : "normal"}
                      />
                    </Space>
                  </Card>
                </Col>
              </Row>

              {errorMessage ? (
                <Alert type="error" showIcon title="Receipt upload issue" description={errorMessage} />
              ) : null}

              {receiptResult ? (
                <Alert
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                  title="Receipt uploaded and analyzed"
                  description={`Extracted ${extractedItemCount} item${extractedItemCount === 1 ? "" : "s"}${receiptResult.merchantName ? ` from ${receiptResult.merchantName}` : ""}.`}
                />
              ) : null}

              <Card
                style={{
                  borderRadius: 24,
                  borderColor: "#d9e2cf",
                  background: "linear-gradient(180deg, #fbfcf7 0%, #f3f6ec 100%)",
                }}
                styles={{ body: { background: "transparent", padding: 24 } }}
              >
                <Space orientation="vertical" size="middle" style={{ width: "100%", display: "flex" }}>
                  <Title level={3} style={{ margin: 0, color: "#18351f" }}>
                    Upload receipt
                  </Title>
                  <Paragraph style={{ margin: 0, color: "#5f6e60" }}>
                    The backend will validate the image, run OCR, and match each
                    extracted line item against Open Food Facts where possible.
                  </Paragraph>

                  <Space wrap size="middle">
                    <Button
                      type="primary"
                      size="large"
                      icon={<CloudUploadOutlined />}
                      disabled={!selectedFile || !pantryTarget}
                      loading={isUploading}
                      onClick={() => void handleUploadReceipt()}
                    >
                      {isUploading ? "Analyzing receipt..." : "Upload and analyze receipt"}
                    </Button>

                    <Button size="large" icon={<InboxOutlined />} onClick={clearSelection}>
                      Clear selection
                    </Button>
                  </Space>

                  <Text type="secondary">
                    After upload, the result is kept in this browser session for
                    the upcoming extracted-items review screen.
                  </Text>
                </Space>
              </Card>
            </Space>
          </Card>
        </div>
      </div>
    </ConfigProvider>
  );
}

export default function PantryReceiptUploadPage() {
  return (
    <Suspense>
      <PantryReceiptUploadPageContent />
    </Suspense>
  );
}
