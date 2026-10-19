import { Loader, MessageSquareWarning,LaptopMinimal } from "lucide-react"
import {  } from "lucide-react"

type Service = {
  id: number
  title: string
  icon: React.ElementType
  description: string
}

const services: Service[] = [
  {
    id: 1,
    title: "Laptop Finder",
    icon: LaptopMinimal,
    description: "Find the perfect laptop for your needs",
  },
  {
    id: 2,
    title: "Rase a complaint",
    icon: MessageSquareWarning,
    description: "Raise a complaint about any issue",
  },
  {
    id: 3,
    title: "Service center",
    icon: Loader,
    description: "Get your laptop repaired at our service center",
  },
 
]


const ServiceBox = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4 justify-items-center">
      {services.map((service) => (
        <div key={service.title} className="flex items-center gap-4 border border-gray-200 p-4 rounded-lg w-full max-w-md">
          <div className="w-12 h-12 flex items-center justify-center bg-linear-to-r from-blue-500 to-indigo-600 rounded-full">
            <service.icon className="text-white w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold">{service.title}</h3>
            <p className="text-sm text-gray-600">{service.description}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ServiceBox