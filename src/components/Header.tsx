import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function Header() {
  return (
    <nav className="flex place-items-center justify-between w-full z-20 px-6 py-4">
      <div className="flex place-items-center gap-4">
        <svg
          width="49"
          height="32"
          viewBox="0 0 49 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            opacity="0.4"
            x="-0.0616287"
            y="-0.704415"
            width="22.0697"
            height="22.0697"
            rx="4.5"
            transform="matrix(0.766046 0.642786 -0.642789 0.766044 31.4149 1.37945)"
            stroke="url(#paint0_linear_67_2447)"
            stroke-dasharray="2 2"
          />
          <rect
            x="-0.241845"
            y="-0.664462"
            width="25.0797"
            height="25.0796"
            rx="4.5"
            transform="matrix(0.906309 0.422617 -0.422619 0.906307 17.1814 0.0399525)"
            fill="#F8F4F2"
            stroke="url(#paint1_linear_67_2447)"
          />
          <rect
            y="3.20776"
            width="25.5847"
            height="25.5846"
            rx="4"
            fill="url(#paint2_linear_67_2447)"
          />
          <defs>
            <linearGradient
              id="paint0_linear_67_2447"
              x1="-25.1849"
              y1="10.6994"
              x2="15.3084"
              y2="10.3702"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#FF1398" />
              <stop offset="0.5" stop-color="#C23FFF" />
              <stop offset="1" stop-color="#3F6FFF" />
            </linearGradient>
            <linearGradient
              id="paint1_linear_67_2447"
              x1="-28.7827"
              y1="12.2279"
              x2="17.4954"
              y2="11.8517"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#FF1398" />
              <stop offset="0.5" stop-color="#C23FFF" />
              <stop offset="1" stop-color="#3F6FFF" />
            </linearGradient>
            <linearGradient
              id="paint2_linear_67_2447"
              x1="-30.5817"
              y1="16.1999"
              x2="18.5889"
              y2="15.8002"
              gradientUnits="userSpaceOnUse"
            >
              <stop stop-color="#FF1398" />
              <stop offset="0.5" stop-color="#C23FFF" />
              <stop offset="1" stop-color="#3F6FFF" />
            </linearGradient>
          </defs>
        </svg>

        <div>
          <p className="font-sans">DYI Series - Analog Card</p>
          <p className="font-sans text-sm">Where did my time go? 😳</p>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Ray</span>
          <Avatar>
            <AvatarFallback className="bg-gray-200 text-gray-600">
              R
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </nav>
  );
}
