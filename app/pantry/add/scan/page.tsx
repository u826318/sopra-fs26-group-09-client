"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Button,
  Card,
  Divider,
  Image,
  Space,
  Typography,
  Upload,
} from "antd";
import type { UploadFile, UploadProps } from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  UploadOutlined,
  BarcodeOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

type PantryTarget = {
  householdId: number;
  householdName?: string;
};

export default function PantryScanPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const pantryTarget = useMemo<PantryTarget | null>(() => {
    if (typeof globalThis.window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(globalThis.location.search);
    const householdId = Number(params.get("householdId"));
    if (!Number.isFinite(householdId) || householdId <= 0) {
      return null;
    }

    return {
      householdId,
      householdName: params.get("householdName") ?? undefined,
    };
  }, []);

    const updateSelectedFile = (file?: File) => {
    if (!file) {
        setFileList([]);
        setPreviewUrl(null);
        return;
    }

    const uploadFile: UploadFile = {
        uid: `${Date.now()}`,
        name: file.name,
        status: "done",
    };

    setFileList([uploadFile]);
    setPreviewUrl(URL.createObjectURL(file));
    };

  const uploadProps: UploadProps = {
    multiple: false,
    maxCount: 1,
    accept: "image/*",
    fileList,
    beforeUpload: (file) => {
      updateSelectedFile(file);
      return false;
    },
    onRemove: () => {
      updateSelectedFile(undefined);
    },
  };

  const handleOpenCamera = () => {
    cameraInputRef.current?.click();
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

  const handleManualBarcode = () => {
    if (!pantryTarget) {
      router.push("/open-food-facts");
      return;
    }

    router.push(
      `/open-food-facts?householdId=${pantryTarget.householdId}&householdName=${encodeURIComponent(
        pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`,
      )}`,
    );
  };

  return (
    <div className="card-container" style={{ padding: 24 }}>
      <Card style={{ width: "100%", maxWidth: 1000 }}>
        <Space orientation="vertical" size="large" style={{ width: "100%" }}>
          <Space
            style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
          >
            <div>
              <Title level={2} style={{ marginBottom: 0 }}>
                Scan product image
              </Title>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Upload a product photo from your device or use your camera to prepare
                barcode detection.
              </Paragraph>
              {pantryTarget ? (
                <Paragraph style={{ marginBottom: 0 }}>
                  Pantry target:{" "}
                  <strong>
                    {pantryTarget.householdName ?? `Household ${pantryTarget.householdId}`}
                  </strong>
                </Paragraph>
              ) : null}
            </div>

            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={handleBackToPantry}>
                Back to pantry
              </Button>
              <Button icon={<BarcodeOutlined />} onClick={handleManualBarcode}>
                Enter barcode manually
              </Button>
            </Space>
          </Space>

          <Alert
            type="info"
            showIcon
            message="This page builds the image upload UI."
            description="Actual barcode extraction API integration and fallback handling can be connected in the next step without changing the page structure."
          />

          <Card title="Choose an image" size="small">
            <Space orientation="vertical" size="large" style={{ width: "100%" }}>
              <Space wrap>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Choose image file</Button>
                </Upload>

                <Button icon={<CameraOutlined />} onClick={handleOpenCamera}>
                  Use camera
                </Button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(event) => updateSelectedFile(event.target.files?.[0])}
                />
              </Space>

              <Text type="secondary">
                Supported input: product package photos from gallery or camera.
              </Text>
            </Space>
          </Card>

          <Divider style={{ margin: 0 }} />

          <Card title="Preview" size="small">
            {previewUrl ? (
              <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
                <Image
                  src={previewUrl}
                  alt="Selected product image"
                  width={320}
                  style={{ objectFit: "contain" }}
                />
                <Alert
                  type="success"
                  showIcon
                  message="Image ready"
                  description="The selected image is ready for barcode extraction in the next step."
                />
              </Space>
            ) : (
              <Alert
                type="warning"
                showIcon
                message="No image selected yet"
                description="Choose a file or take a photo to preview it here."
              />
            )}
          </Card>

          <Card title="Next step" size="small">
            <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
              <Text>
                After API integration, this page will send the selected image to the
                barcode detection endpoint and continue the add-to-pantry flow.
              </Text>
              <Space wrap>
                <Button type="primary" disabled={!previewUrl}>
                  Ready for barcode detection
                </Button>
                <Button onClick={handleManualBarcode}>
                  Fallback to manual barcode entry
                </Button>
              </Space>
            </Space>
          </Card>
        </Space>
      </Card>
    </div>
  );


}