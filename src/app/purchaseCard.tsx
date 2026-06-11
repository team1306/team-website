import { Card, CardDescription, CardTitle } from "@/components/ui/card"

type request = {
    itemName: string;
    cost: number;
    requestor: string;
    catagory: string;
}

export default function Purchase({itemName, cost, requestor, catagory}: request) {
    return (
        <div>
            <Card className="m-3 mt-4 p-2 bg-mist-500 h-fit">
                <div className="flex gap-3 items-stretch">
                    <div className="p-4 rounded-lg flex items-center">
                        <CardTitle className="text-2xl font-bold text-zinc-100">{itemName}</CardTitle>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-fit h-fit mt-2 pt-1 pb-1">
                        <h3 className="text-xs font-bold text-zinc-100">Cost:</h3>
                        <h2 className="text-base font-bold text-zinc-100">${cost}</h2>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-fit h-fit mt-2 pt-1 pb-1">
                        <h3 className="text-xs font-bold text-zinc-100">Requested By:</h3>
                        <h2 className="text-base font-bold text-zinc-100">{requestor}</h2>
                    </div>
                    <div className="bg-mist-600 pl-4 pr-4 rounded-lg w-fit h-fit mt-2 pt-1 pb-1">
                        <h3 className="text-xs font-bold text-zinc-100">Category:</h3>
                        <h2 className="text-base font-bold text-zinc-100">{catagory}</h2>
                    </div>
                </div>
            </Card>
        </div>
    )
}