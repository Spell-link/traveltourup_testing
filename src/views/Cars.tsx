import React from "react";
import { HubPageH1 } from "@/components/seo/hub-page-h1";
import CarsTab from "@/components/cars/CarsTab";
import CarList from "@/components/cars/CarList";
import RecommendedCars from "@/components/cars/RecommendedCars";


const Cars = (): React.ReactElement => {
  const featuredCarData = {
    title: "Premium Car Transfers",
    description: "Luxury and comfort for your journey with professional drivers",
    buttonText: "Explore All Cars",
    image: "/images/assets/featuredcars.jpg",
  };

  const carsData = [
    { id: 1, name: "Toyota Camry", type: "Sedan", passengers: 4, luggage: 2, price: 45, originalPrice: 60, image: "/images/assets/car1.jpg", features: ["AC", "WiFi", "GPS"] },
    { id: 2, name: "Honda Accord", type: "Sedan", passengers: 4, luggage: 3, price: 48, originalPrice: 65, image: "/images/assets/car2.jpg", features: ["AC", "USB", "Leather"] },
    { id: 3, name: "Toyota RAV4", type: "SUV", passengers: 5, luggage: 4, price: 65, originalPrice: 85, image: "/images/assets/car3.jpg", features: ["AC", "4WD", "Roof Rack"] },
    { id: 4, name: "Ford Explorer", type: "SUV", passengers: 7, luggage: 5, price: 75, originalPrice: 95, image: "/images/assets/car5.jpg", features: ["AC", "7 Seats", "Premium Sound"] },
    { id: 5, name: "Mercedes E-Class", type: "Luxury", passengers: 4, luggage: 3, price: 120, originalPrice: 150, image: "/images/assets/car4.jpg", features: ["Leather", "Panoramic", "Massage Seats"] },
    { id: 6, name: "BMW 5 Series", type: "Luxury", passengers: 4, luggage: 2, price: 125, originalPrice: 160, image: "/images/assets/car3.jpg", features: ["Premium", "Heated Seats", "Entertainment"] },
    { id: 7, name: "Toyota Sienna", type: "Van", passengers: 8, luggage: 6, price: 85, originalPrice: 110, image: "/images/assets/car2.jpg", features: ["AC", "8 Seats", "Sliding Doors"] },
    { id: 8, name: "Mercedes V-Class", type: "Van", passengers: 8, luggage: 7, price: 110, originalPrice: 140, image: "/images/assets/car1.jpg", features: ["Luxury", "TV", "Refrigerator"] }
  ];

  return (
    <div>
      <main>
        <HubPageH1 page="Cars" />
        <div className="relative top-0 bg-muted p-2">
          <div className="relative  top-[-40px]   z-20  ">
            <div id="hotel-search" className="max-w-7xl  mx-auto bg-background/80 rounded-xl shadow-xl border border-border/50">
              <div className="p-4 sm:p-6"><CarsTab />  </div>
            </div>
          </div>
        </div>
        <CarList />
        <RecommendedCars featuredCar={featuredCarData} cars={carsData} bgColor="bg-muted/40" />
      </main>
    </div>
  );
};

export default Cars;
