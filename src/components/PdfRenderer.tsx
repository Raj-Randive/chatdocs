"use client"
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Loader2, RotateCcw, RotateCw, SearchIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Document, Page, pdfjs } from "react-pdf";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { useResizeDetector } from "react-resize-detector";
import SimpleBar from "simplebar-react";
import { z } from "zod";
import PdfFullScreen from "./PdfFullScreen";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import { useToast } from "./ui/use-toast";

interface PdfRendererProps {
    url: string
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url,
).toString();

// pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`


const PdfRenderer = ({ url }: PdfRendererProps) => {
    const { toast } = useToast()
    const [numPages, setNumPages] = useState<number>();
    const [currPage, setCurrPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [rotation, setRotation] = useState<number>(0);
    const [renderedScale, setRenderedScale] = useState<number | null>(null);

    const isLoading = renderedScale !== scale

    const CustomePageValidator = z.object({
        page: z.string().refine((num) => Number(num) > 0 && Number(num) <= numPages!)
    })

    type TypeCustomePageValidator = z.infer<typeof CustomePageValidator>

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<TypeCustomePageValidator>({
        defaultValues: {
            page: "1"
        },
        resolver: zodResolver(CustomePageValidator)
    })



    const { width, ref } = useResizeDetector()

    const handlePageSubmit = ({ page }: TypeCustomePageValidator) => {
        setCurrPage(Number(page))
        setValue("page", String(page))
    }


    return (
        <div className="w-full bg-white rounded-md shadow flex flex-col items-center ">
            {/* ************************************************* */}
            <div className="h-14 w-full border-b border-zinc-200 flex items-center justify-between px-2">

                <div className="flex items-center gap-1.5">
                    <Button
                        disabled={currPage <= 1}
                        variant={"ghost"}
                        aria-label="previous page"
                        onClick={() => {
                            setCurrPage((prev) => (prev - 1 > 1 ? prev - 1 : 1))
                            setValue("page", String(currPage - 1));
                        }}
                    >
                        <ChevronDown className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1.5">
                        <Input
                            {...register("page")}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleSubmit(handlePageSubmit)()
                                }
                            }}

                            className={cn("w-12 h-8", errors.page && "focus-visible:ring-red-500")}
                        />
                        <p className="text-zinc-700 text-sm space-x-1">
                            <span>/</span>
                            <span>{numPages ?? "x"}</span>
                        </p>
                    </div>

                    <Button
                        disabled={numPages === undefined || currPage === numPages}
                        variant={"ghost"}
                        aria-label="next page"
                        onClick={() => {
                            setCurrPage((prev) => (prev + 1 > numPages! ? numPages! : prev + 1))
                            setValue("page", String(currPage + 1));
                        }}
                    >
                        <ChevronUp className="h-4 w-4" />
                    </Button>

                </div>


                {/* Zooming the PDF */}

                <div className="space-x-2">
                    <DropdownMenu>

                        <DropdownMenuTrigger asChild>
                            <Button className="gap-1.5" aria-label="zoom" variant="ghost">
                                <SearchIcon className="h-4 w-4" />
                                {scale * 100}%<ChevronDown className="h-3 w-3 opacity-55" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setScale(1)}>
                                100%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(1.5)}>
                                150%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2)}>
                                200%
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setScale(2.5)}>
                                250%
                            </DropdownMenuItem>
                        </DropdownMenuContent>

                    </DropdownMenu>

                    {/* Rotate the PDF */}
                    <Button
                        aria-label="rotate 90 degress"
                        variant="ghost"
                        onClick={() => setRotation((prev) => prev + 90)}
                    >
                        <RotateCw className="h-4 w-4" />
                    </Button>


                    {/* Full Screen Button for viewing the PDF */}
                    <PdfFullScreen fileUrl={url} />
                </div>


            </div>

            {/* ************************************************* */}

            <div className="flex-1 w-full max-h-screen">
                <SimpleBar autoHide={false} className="max-h-[calc(100vh-10rem)]">
                    <div ref={ref} >
                        <Document
                            loading={
                                <div className="flex justify-center">
                                    <Loader2 className="my-24 h-6 w-6 animate-spin" />
                                </div>
                            }

                            onLoadError={() => {
                                toast({
                                    title: "Error loading PDF",
                                    description: "Please try again later",
                                    variant: "destructive"

                                })
                            }}

                            // For no. pages
                            onLoadSuccess={({ numPages }) => {
                                setNumPages(numPages)
                            }}

                            file={url}
                            className="max-h-full"
                        >
                            {/* Here we are changing the page to conditional rendering the page so when zoomed in: for that loading time we can show the last page of pdf */}

                            {isLoading && renderedScale ? (
                                <Page
                                    width={width ? width : 1}
                                    pageNumber={currPage}
                                    scale={scale}
                                    rotate={rotation}
                                    key={"@" + renderedScale}
                                />
                            ) : null
                            }
                            <Page
                                className={cn(isLoading ? "hidden" : "")}
                                width={width ? width : 1}
                                pageNumber={currPage}
                                scale={scale}
                                rotate={rotation}
                                key={"@" + scale}
                                loading={
                                    <div className="flex justify-center">
                                        <Loader2 className="ny-24 h-6 w-6 animate-spin" />
                                    </div>
                                }
                                onRenderSuccess={
                                    () => setRenderedScale(scale)
                                }
                            />
                        </Document>
                    </div>
                </SimpleBar >

            </div>
        </div>
    )
}

export default PdfRenderer;