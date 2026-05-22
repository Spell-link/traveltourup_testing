"use client";

import React from "react";

export interface DetailPageLayoutProps {
  mainContent: React.ReactNode;
  sidebarContent: React.ReactNode;
  bottomContent?: React.ReactNode;
}

/**
 * Generic layout for detail pages (flight, hotel, car).
 * Structure: main (left) + right sidebar (sticky) + bottom (full width).
 */
export function DetailPageLayout({
  mainContent,
  sidebarContent,
  bottomContent,
}: DetailPageLayoutProps) {
  return (
    <div className="container mx-auto bg-muted py-4 px-4 sm:p-6 md:p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-8">
        {/* Main content - left, flex-1 */}
        <div className="lg:col-span-2 space-y-6">
          {mainContent}

           {/* Bottom - full width (reviews) */}
      {bottomContent && (
        <div className="mt-12 pt-8 border-t border-border">
          {bottomContent}
        </div>
      )}
        </div>

        {/* Right sidebar - sticky */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">{sidebarContent}</div>
        </div>
      </div>

     
    </div>
  );
}
