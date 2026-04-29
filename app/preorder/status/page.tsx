"use client";

import { useState } from "react";
import {
  Search,
  Ticket,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_STEPS = [
  { key: "pending", label: "Received", icon: AlertCircle },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Clock },
  { key: "ready", label: "Ready", icon: CheckCircle },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default function PreorderStatusPage() {
  const [searchType, setSearchType] = useState("waitlist"); // waitlist, phone, order
  const [searchValue, setSearchValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [preorder, setPreorder] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!searchValue) {
      toast.error("Please enter a value to search");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchType === "waitlist") {
        params.append("waitlistNumber", searchValue.toUpperCase());
      } else if (searchType === "phone") {
        params.append("phone", searchValue.replace(/\D/g, ""));
      } else {
        params.append("orderNumber", searchValue.toUpperCase());
      }

      const response = await fetch(`/api/preorder/status?${params}`);
      const data = await response.json();

      if (data.success) {
        setPreorder(data.preorder);
      } else {
        setError(data.error || "Preorder not found");
        setPreorder(null);
      }
    } catch (err) {
      setError("Failed to check status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStep = (status) => {
    return STATUS_STEPS.findIndex((s) => s.key === status);
  };

  const currentStep = preorder ? getStatusStep(preorder.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-12 px-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Check Preorder Status</h1>
          <p className="text-muted-foreground">
            Enter your waitlist number or phone number
          </p>
        </div>

        {/* Search Form */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Search Type Toggle */}
            <div className="flex gap-2">
              {[
                { key: "waitlist", label: "Waitlist #", icon: Ticket },
                { key: "phone", label: "Phone", icon: Phone },
                { key: "order", label: "Order #", icon: Search },
              ].map((type) => (
                <Button
                  key={type.key}
                  variant={searchType === type.key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setSearchType(type.key);
                    setSearchValue("");
                    setPreorder(null);
                    setError(null);
                  }}
                  className="flex-1"
                >
                  <type.icon className="w-4 h-4 mr-1" />
                  {type.label}
                </Button>
              ))}
            </div>

            {/* Input */}
            <div>
              <Label>
                {searchType === "waitlist" && "Waitlist Number (e.g., S-2815)"}
                {searchType === "phone" && "Phone Number"}
                {searchType === "order" && "Order Number"}
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={
                    searchType === "waitlist"
                      ? "S-2815"
                      : searchType === "phone"
                      ? "(555) 123-4567"
                      : "PRE-XXXXX"
                  }
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={isLoading || !searchValue}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preorder Status */}
        {preorder && (
          <Card className="border-2 border-emerald-500">
            <CardHeader className="bg-emerald-500 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Preorder #{preorder.orderNumber}</CardTitle>
                  <p className="text-emerald-100 text-sm">{preorder.pickupLocation}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{preorder.waitlistNumber}</div>
                  <div className="text-emerald-100 text-xs">Waitlist #</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Status Progress */}
              <div>
                <p className="text-sm font-medium mb-3">Order Status</p>
                <div className="flex items-center justify-between">
                  {STATUS_STEPS.map((step, idx) => {
                    const Icon = step.icon;
                    const isActive = idx <= currentStep;
                    const isCurrent = idx === currentStep;

                    return (
                      <div
                        key={step.key}
                        className="flex flex-col items-center"
                      >
                        <div
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center",
                            isCurrent
                              ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                              : isActive
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-200 text-gray-400"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={cn(
                            "text-xs mt-1",
                            isActive ? "text-emerald-700 font-medium" : "text-gray-400"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Position Info */}
              {preorder.position && preorder.position > 0 && (
                <div className="bg-emerald-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-emerald-800">
                    You are <strong>#{preorder.position}</strong> in line
                  </p>
                  {preorder.estimatedReadyTime && (
                    <p className="text-lg font-bold text-emerald-700 mt-1">
                      Est. ready: {preorder.estimatedReadyTime}
                    </p>
                  )}
                </div>
              )}

              {/* Status Message */}
              <div
                className={cn(
                  "p-4 rounded-lg",
                  preorder.status === "ready"
                    ? "bg-green-50 border border-green-200"
                    : "bg-blue-50 border border-blue-200"
                )}
              >
                <div className="flex items-start gap-3">
                  {preorder.status === "ready" ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="text-green-800">
                        <p className="font-medium">Your order is ready!</p>
                        <p className="text-sm mt-1">
                          Show your waitlist number <strong>#{preorder.waitlistNumber}</strong> at the pickup
                          booth.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div className="text-blue-800">
                        <p className="font-medium">{preorder.statusMessage}</p>
                        {preorder.estimatedReadyTime && (
                          <p className="text-sm mt-1">
                            Estimated ready time: <strong>{preorder.estimatedReadyTime}</strong>
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Order Details */}
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between py-2 border-b">
                  <span>Pickup Location:</span>
                  <span className="text-foreground">{preorder.pickupLocation}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Pickup Hours:</span>
                  <span className="text-foreground">{preorder.pickupHours}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Total:</span>
                  <span className="text-foreground font-medium">
                    ${preorder.total?.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Status
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Can&apos;t find your order?{" "}
            <a href="tel:+14045551234" className="text-emerald-600 hover:underline">
              Call us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
